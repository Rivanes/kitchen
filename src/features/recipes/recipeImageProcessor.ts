export type ProcessedRecipeImage = {
  blob: Blob
  mimeType: 'image/avif' | 'image/webp'
  extension: 'avif' | 'webp'
  width: number
  height: number
  byteSize: number
}

const MAX_INPUT_BYTES = 25 * 1024 * 1024
export const RECIPE_COVER_MAX_OUTPUT_BYTES = 1536 * 1024
export const RECIPE_COVER_MAX_LONG_EDGE = 1600

type LoadedImage = {
  image: HTMLImageElement
  revoke: () => void
}

function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      resolve({
        image,
        revoke: () => URL.revokeObjectURL(objectUrl),
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Nie udało się odczytać tego zdjęcia. Wybierz inny plik albo zrób nowe zdjęcie.'))
    }

    image.src = objectUrl
  })
}

function dimensionsFor(width: number, height: number, maxLongEdge: number) {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return { width, height }

  const scale = maxLongEdge / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

async function encodeExact(
  canvas: HTMLCanvasElement,
  mimeType: 'image/avif' | 'image/webp',
  quality: number,
) {
  const blob = await canvasBlob(canvas, mimeType, quality)
  if (!blob || blob.type !== mimeType) return null
  return blob
}

function validateSource(file: File) {
  if (!file.size) throw new Error('Wybrane zdjęcie jest puste.')
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Zdjęcie jest zbyt duże do bezpiecznej obróbki. Wybierz plik do 25 MB.')
  }
  if (file.type === 'image/svg+xml') {
    throw new Error('Grafiki SVG nie są obsługiwane jako zdjęcia przepisu.')
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Wybierz plik ze zdjęciem.')
  }
}

export async function processRecipeCoverImage(file: File): Promise<ProcessedRecipeImage> {
  validateSource(file)

  const loaded = await loadImage(file)
  try {
    const sourceWidth = loaded.image.naturalWidth
    const sourceHeight = loaded.image.naturalHeight
    if (!sourceWidth || !sourceHeight) {
      throw new Error('Nie udało się odczytać wymiarów zdjęcia.')
    }

    const dimensionSteps = [1600, 1440, 1280, 1080]
    const avifQualities = [0.68, 0.58, 0.5, 0.44]
    const webpQualities = [0.8, 0.72, 0.64, 0.58]

    let avifSupported: boolean | null = null
    let bestSupported: ProcessedRecipeImage | null = null

    for (const maxLongEdge of dimensionSteps) {
      const size = dimensionsFor(sourceWidth, sourceHeight, maxLongEdge)
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height

      const context = canvas.getContext('2d', { alpha: false })
      if (!context) {
        throw new Error('Ta przeglądarka nie pozwala przygotować zdjęcia przepisu.')
      }

      context.drawImage(loaded.image, 0, 0, size.width, size.height)

      if (avifSupported !== false) {
        for (const quality of avifQualities) {
          const blob = await encodeExact(canvas, 'image/avif', quality)
          if (!blob) {
            avifSupported = false
            break
          }

          avifSupported = true
          const candidate: ProcessedRecipeImage = {
            blob,
            mimeType: 'image/avif',
            extension: 'avif',
            width: size.width,
            height: size.height,
            byteSize: blob.size,
          }

          if (!bestSupported || candidate.byteSize < bestSupported.byteSize) {
            bestSupported = candidate
          }
          if (candidate.byteSize <= RECIPE_COVER_MAX_OUTPUT_BYTES) return candidate
        }
      }

      // WebP is a fallback ONLY if this runtime cannot encode AVIF.
      if (avifSupported === false) {
        for (const quality of webpQualities) {
          const blob = await encodeExact(canvas, 'image/webp', quality)
          if (!blob) continue

          const candidate: ProcessedRecipeImage = {
            blob,
            mimeType: 'image/webp',
            extension: 'webp',
            width: size.width,
            height: size.height,
            byteSize: blob.size,
          }

          if (!bestSupported || candidate.byteSize < bestSupported.byteSize) {
            bestSupported = candidate
          }
          if (candidate.byteSize <= RECIPE_COVER_MAX_OUTPUT_BYTES) return candidate
        }
      }
    }

    if (bestSupported && bestSupported.byteSize <= 2 * 1024 * 1024) {
      return bestSupported
    }

    if (avifSupported === false) {
      throw new Error('Nie udało się bezpiecznie skompresować zdjęcia do WebP.')
    }

    throw new Error('Nie udało się bezpiecznie skompresować zdjęcia do AVIF.')
  } finally {
    loaded.revoke()
  }
}
