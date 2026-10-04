export const RECIPE_COVER_HERO_ASPECT = 16 / 10
export const RECIPE_COVER_THUMBNAIL_ASPECT = 1

export type NormalizedFocus = {
  x: number
  y: number
}

export type ContainedImageRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CoverPixelLayout = {
  left: number
  top: number
  width: number
  height: number
}

export function clampNormalized(value: number) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function getContainedImageRect(input: {
  containerWidth: number
  containerHeight: number
  sourceWidth: number
  sourceHeight: number
}): ContainedImageRect {
  const { containerWidth, containerHeight, sourceWidth, sourceHeight } = input
  if (
    containerWidth <= 0
    || containerHeight <= 0
    || sourceWidth <= 0
    || sourceHeight <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const scale = Math.min(containerWidth / sourceWidth, containerHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  }
}

export function mapPointerToSourceFocus(input: {
  pointerX: number
  pointerY: number
  containedRect: ContainedImageRect
}): NormalizedFocus {
  const { pointerX, pointerY, containedRect } = input
  if (containedRect.width <= 0 || containedRect.height <= 0) {
    return { x: 0.5, y: 0.5 }
  }

  return {
    x: clampNormalized((pointerX - containedRect.x) / containedRect.width),
    y: clampNormalized((pointerY - containedRect.y) / containedRect.height),
  }
}

/**
 * Exact `object-fit: cover` geometry for the ACTUAL rendered box.
 *
 * cover_focus_x/y are normalized coordinates on the full source image.
 * The requested source point is kept at the center of the container whenever
 * enough overflow exists, and is clamped only when an image edge is reached.
 */
export function calculateCoverPixelLayout(input: {
  sourceWidth: number
  sourceHeight: number
  containerWidth: number
  containerHeight: number
  focusX: number
  focusY: number
}): CoverPixelLayout {
  const {
    sourceWidth,
    sourceHeight,
    containerWidth,
    containerHeight,
  } = input

  if (
    sourceWidth <= 0
    || sourceHeight <= 0
    || containerWidth <= 0
    || containerHeight <= 0
  ) {
    return { left: 0, top: 0, width: 0, height: 0 }
  }

  const focusX = clampNormalized(input.focusX)
  const focusY = clampNormalized(input.focusY)
  const scale = Math.max(containerWidth / sourceWidth, containerHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  const minimumLeft = Math.min(0, containerWidth - width)
  const minimumTop = Math.min(0, containerHeight - height)

  const desiredLeft = containerWidth / 2 - focusX * width
  const desiredTop = containerHeight / 2 - focusY * height

  return {
    left: clamp(desiredLeft, minimumLeft, 0),
    top: clamp(desiredTop, minimumTop, 0),
    width,
    height,
  }
}
