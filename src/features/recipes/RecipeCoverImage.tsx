import { ImgHTMLAttributes, useEffect, useMemo, useState } from 'react'
import { calculateCoverObjectPosition } from './recipeCoverCrop'

type RecipeCoverImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string
  focusX: number
  focusY: number
  targetAspect: number
}

export function RecipeCoverImage({
  src,
  focusX,
  focusY,
  targetAspect,
  style,
  onLoad,
  ...imageProps
}: RecipeCoverImageProps) {
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setSourceSize({ width: 0, height: 0 })
  }, [src])

  const position = useMemo(() => calculateCoverObjectPosition({
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    targetAspect,
    focusX,
    focusY,
  }), [focusX, focusY, sourceSize.height, sourceSize.width, targetAspect])

  return (
    <img
      {...imageProps}
      src={src}
      onLoad={(event) => {
        setSourceSize({
          width: event.currentTarget.naturalWidth,
          height: event.currentTarget.naturalHeight,
        })
        onLoad?.(event)
      }}
      style={{
        ...style,
        objectPosition: `${position.x * 100}% ${position.y * 100}%`,
      }}
    />
  )
}
