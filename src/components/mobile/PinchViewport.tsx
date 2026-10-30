import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGestures } from '@/hooks/useGestures'
import { useUiStore } from '@/store/uiStore'
import { haptics } from '@/mobile/haptics'
import { clamp } from '@/lib/math'

export type PinchViewportProps = {
  children: React.ReactNode
  /** Canvas aspect ratio (width / height); used to fit content on mount. */
  aspect: number
  minScale?: number
  maxScale?: number
  className?: string
}

export type ViewportTransform = {
  scale: number
  offsetX: number
  offsetY: number
}

const MAX_DPR = 2

/**
 * Pinch-to-zoom / two-finger-pan canvas container. Gestures are applied to a
 * CSS transform on the wrapper, so no re-render of the child canvas is needed
 * per gesture frame — the browser compositor handles it.
 */
export const PinchViewport = ({
  children,
  aspect,
  minScale = 0.25,
  maxScale = 6,
  className,
}: PinchViewportProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<ViewportTransform>({ scale: 1, offsetX: 0, offsetY: 0 })
  const gestureStart = useRef<ViewportTransform>({ scale: 1, offsetX: 0, offsetY: 0 })
  const [size, setSize] = useState({ width: 0, height: 0 })

  const viewportMode = useUiStore((state) => state.viewportMode)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const fitted = useMemo(() => {
    if (size.width === 0 || size.height === 0) return { width: 0, height: 0, scale: 1 }
    const containerAspect = size.width / size.height
    if (viewportMode === 'fill') {
      if (aspect > containerAspect) {
        return { width: size.width, height: size.width / aspect, scale: size.height / (size.width / aspect) }
      }
      return { width: size.height * aspect, height: size.height, scale: size.width / (size.height * aspect) }
    }
    if (aspect > containerAspect) {
      return { width: size.width, height: size.width / aspect, scale: 1 }
    }
    return { width: size.height * aspect, height: size.height, scale: 1 }
  }, [aspect, size, viewportMode])

  const reset = useCallback(() => {
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 })
  }, [])

  useEffect(() => {
    reset()
  }, [viewportMode, reset])

  const { ref: gestureRef } = useGestures<HTMLDivElement>(
    {
    onPinch: (scale) => {
      const next = clamp(gestureStart.current.scale * scale, minScale, maxScale)
      setTransform((current) => ({ ...current, scale: next }))
    },
    onPanStart: () => {
      gestureStart.current = { ...transform }
    },
    onPanMove: (dx, dy) => {
      setTransform({
        scale: gestureStart.current.scale,
        offsetX: gestureStart.current.offsetX + dx,
        offsetY: gestureStart.current.offsetY + dy,
      })
    },
      onDoubleTap: () => {
        haptics.trigger('light')
        setTransform((current) =>
          current.scale > 1.05 ? { scale: 1, offsetX: 0, offsetY: 0 } : { scale: 2, offsetX: 0, offsetY: 0 },
        )
      },
    },
    containerRef,
  )

  useEffect(() => {
    const node = gestureRef.current
    const content = contentRef.current
    if (!node || !content) return
    // Compose into a single matrix so the browser only promotes one layer.
    content.style.transform = `translate3d(${transform.offsetX}px, ${transform.offsetY}px, 0) scale(${transform.scale})`
  }, [transform, gestureRef])

  const dpr = Math.min(MAX_DPR, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

  return (
    <div
      ref={gestureRef}
      className={`gesture-surface relative flex items-center justify-center overflow-hidden bg-black ${className ?? ''}`}
    >
      <div
        ref={contentRef}
        style={{
          width: fitted.width || undefined,
          height: fitted.height || undefined,
          willChange: 'transform',
        }}
        className="origin-center"
        data-dpr={dpr}
      >
        {children}
      </div>
      <div className="bottom-dock absolute right-2 flex gap-1">
        <button type="button" className="btn btn-ghost touch-target bg-black/50" onClick={reset} aria-label="Reset zoom">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0114-3M20 14a8 8 0 01-14 3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
