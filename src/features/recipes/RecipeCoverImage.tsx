import { ImgHTMLAttributes, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { calculateCoverPixelLayout } from './recipeCoverCrop'

type RecipeCoverImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string
  focusX: number
  focusY: number
}

type Size = { width: number; height: number }

export function RecipeCoverImage({
  src,
  focusX,
  focusY,
  style,
  onLoad,
  ...imageProps
}: RecipeCoverImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [sourceSize, setSourceSize] = useState<Size>({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    setSourceSize({ width: 0, height: 0 })
  }, [src])

  useLayoutEffect(() => {
    const image = imageRef.current
    const container = image?.parentElement
    if (!container) return

    const update = () => {
      const rect = container.getBoundingClientRect()
      setContainerSize({ width: rect.width, height: rect.height })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [src])

  const layout = useMemo(() => calculateCoverPixelLayout({
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    containerWidth: containerSize.width,
    containerHeight: containerSize.height,
    focusX,
    focusY,
  }), [
    containerSize.height,
    containerSize.width,
    focusX,
    focusY,
    sourceSize.height,
    sourceSize.width,
  ])

  const ready = layout.width > 0 && layout.height > 0

  return (
    <img
      {...imageProps}
      ref={imageRef}
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
        position: 'absolute',
        maxWidth: 'none',
        width: ready ? `${layout.width}px` : '100%',
        height: ready ? `${layout.height}px` : '100%',
        left: ready ? `${layout.left}px` : '0px',
        top: ready ? `${layout.top}px` : '0px',
        objectFit: ready ? 'fill' : 'cover',
        objectPosition: 'center',
      }}
    />
  )
}
