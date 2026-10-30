import { useCallback, useEffect, useRef } from 'react'

export type GestureHandlers = {
  onTap?: (x: number, y: number) => void
  onDoubleTap?: (x: number, y: number) => void
  onLongPress?: (x: number, y: number) => void
  onPanStart?: (x: number, y: number) => void
  onPanMove?: (dx: number, dy: number, x: number, y: number) => void
  onPanEnd?: (dx: number, dy: number) => void
  onPinch?: (scale: number, centerX: number, centerY: number) => void
  onRotate?: (degrees: number) => void
}

export type UseGesturesOptions = GestureHandlers & {
  /** Minimum travel before a press is treated as a drag. */
  moveTolerance?: number
  doubleTapMs?: number
  longPressMs?: number
}

type Point = { x: number; y: number }

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

const angleBetween = (a: Point, b: Point) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI

/**
 * Attaches pointer-based gestures to a ref'd element. Handlers are read from a
 * ref so consumers can pass fresh closures without re-binding listeners.
 */
export const useGestures = <T extends HTMLElement>(
  options: UseGesturesOptions,
  /** Optional external ref, for callers that need the same node elsewhere. */
  externalRef?: React.RefObject<T>,
): { ref: React.RefObject<T> } => {
  const internalRef = useRef<T>(null)
  const ref = externalRef ?? internalRef
  const optionsRef = useRef(options)
  optionsRef.current = options

  const handleTap = useCallback((x: number, y: number) => {
    const { onTap, onDoubleTap } = optionsRef.current
    const now = Date.now()
    const last = tapState.current
    if (onDoubleTap && now - last.time < (optionsRef.current.doubleTapMs ?? 280)) {
      tapState.current = { time: 0, x, y }
      onDoubleTap(x, y)
      return
    }
    tapState.current = { time: now, x, y }
    onTap?.(x, y)
  }, [])

  const tapState = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const active = new Map<number, Point>()
    let moved = false
    let start: Point = { x: 0, y: 0 }
    let pinchStart = 0
    let rotateStart = 0
    let longPressTimer: ReturnType<typeof setTimeout> | null = null

    const clearLongPress = () => {
      if (longPressTimer) clearTimeout(longPressTimer)
      longPressTimer = null
    }

    const localPoint = (event: PointerEvent): Point => {
      const rect = element.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const onPointerDown = (event: PointerEvent) => {
      const point = localPoint(event)
      active.set(event.pointerId, point)
      element.setPointerCapture?.(event.pointerId)

      if (active.size === 1) {
        moved = false
        start = point
        optionsRef.current.onPanStart?.(point.x, point.y)
        clearLongPress()
        longPressTimer = setTimeout(() => {
          if (!moved && active.size === 1) optionsRef.current.onLongPress?.(point.x, point.y)
        }, optionsRef.current.longPressMs ?? 500)
      } else if (active.size === 2) {
        const [a, b] = [...active.values()]
        pinchStart = distance(a, b)
        rotateStart = angleBetween(a, b)
        clearLongPress()
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!active.has(event.pointerId)) return
      const point = localPoint(event)
      active.set(event.pointerId, point)
      const tolerance = optionsRef.current.moveTolerance ?? 8

      if (active.size === 1) {
        if (!moved && Math.hypot(point.x - start.x, point.y - start.y) > tolerance) {
          moved = true
          clearLongPress()
        }
        if (moved) {
          optionsRef.current.onPanMove?.(point.x - start.x, point.y - start.y, point.x, point.y)
        }
        return
      }

      if (active.size === 2) {
        const [a, b] = [...active.values()]
        const current = distance(a, b)
        const scale = pinchStart > 0 ? current / pinchStart : 1
        const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        optionsRef.current.onPinch?.(scale, center.x, center.y)
        optionsRef.current.onRotate?.(angleBetween(a, b) - rotateStart)
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      const point = active.get(event.pointerId)
      active.delete(event.pointerId)
      clearLongPress()

      if (active.size === 0) {
        if (moved) {
          optionsRef.current.onPanEnd?.(point ? point.x - start.x : 0, point ? point.y - start.y : 0)
        } else if (point) {
          handleTap(point.x, point.y)
        }
        moved = false
      }
    }

    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)

    return () => {
      clearLongPress()
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerUp)
    }
  }, [handleTap])

  return { ref }
}
