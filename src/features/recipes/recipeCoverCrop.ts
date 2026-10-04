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

export type CoverObjectPosition = {
  x: number
  y: number
}

export function clampNormalized(value: number) {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
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

export function calculateCoverObjectPosition(input: {
  sourceWidth: number
  sourceHeight: number
  targetAspect: number
  focusX: number
  focusY: number
}): CoverObjectPosition {
  const sourceWidth = input.sourceWidth
  const sourceHeight = input.sourceHeight
  const targetAspect = input.targetAspect
  const focusX = clampNormalized(input.focusX)
  const focusY = clampNormalized(input.focusY)

  if (sourceWidth <= 0 || sourceHeight <= 0 || targetAspect <= 0) {
    return { x: 0.5, y: 0.5 }
  }

  // Normalize the target to targetAspect x 1. This keeps the math independent
  // from rendered pixel size while preserving exact cover geometry.
  const targetWidth = targetAspect
  const targetHeight = 1
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const renderedWidth = sourceWidth * scale
  const renderedHeight = sourceHeight * scale
  const overflowX = renderedWidth - targetWidth
  const overflowY = renderedHeight - targetHeight

  const x = overflowX <= 1e-9
    ? 0.5
    : clampNormalized((focusX * renderedWidth - targetWidth / 2) / overflowX)

  const y = overflowY <= 1e-9
    ? 0.5
    : clampNormalized((focusY * renderedHeight - targetHeight / 2) / overflowY)

  return { x, y }
}
