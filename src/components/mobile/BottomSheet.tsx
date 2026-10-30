import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUiStore } from '@/store/uiStore'
import { haptics } from '@/mobile/haptics'

export type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Fraction of viewport height when collapsed / expanded. */
  minHeight?: number
  maxHeight?: number
  /** Snap the sheet to a mid detent as well as the extremes. */
  detents?: number[]
  footer?: React.ReactNode
  ariaLabel?: string
}

const VELOCITY_THRESHOLD = 0.6

/**
 * Drag-to-dismiss sheet anchored to the bottom edge. Snapping uses both
 * position and velocity: a fast flick in either direction wins over the
 * nearest detent, which is what users expect from native sheets.
 */
export const BottomSheet = ({
  open,
  onClose,
  title,
  children,
  minHeight = 0.3,
  maxHeight = 0.92,
  detents,
  footer,
  ariaLabel,
}: BottomSheetProps) => {
  const setSheetHeight = useUiStore((state) => state.setSheetHeight)
  const [height, setHeight] = useState(minHeight)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ startY: 0, startHeight: minHeight, lastY: 0, lastTime: 0, velocity: 0 })
  const sheetRef = useRef<HTMLDivElement>(null)

  const snapPoints = useMemo(
    () => (detents && detents.length > 0 ? [...detents].sort((a, b) => a - b) : [minHeight, maxHeight]),
    [detents, minHeight, maxHeight],
  )

  useEffect(() => {
    if (open) {
      setHeight(snapPoints[snapPoints.length - 1])
      setSheetHeight(snapPoints[snapPoints.length - 1])
    }
  }, [open, snapPoints, setSheetHeight])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const nearestSnap = useCallback(
    (value: number) => {
      let best = snapPoints[0]
      let bestDistance = Infinity
      for (const point of snapPoints) {
        const distance = Math.abs(point - value)
        if (distance < bestDistance) {
          bestDistance = distance
          best = point
        }
      }
      return best
    },
    [snapPoints],
  )

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true)
    dragRef.current = {
      startY: event.clientY,
      startHeight: height,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocity: 0,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const now = performance.now()
    const dt = Math.max(1, now - dragRef.current.lastTime)
    const deltaPx = dragRef.current.startY - event.clientY
    const next = dragRef.current.startHeight + deltaPx / window.innerHeight
    dragRef.current.velocity = (dragRef.current.lastY - event.clientY) / dt
    dragRef.current.lastY = event.clientY
    dragRef.current.lastTime = now
    setHeight(Math.min(maxHeight, Math.max(0.12, next)))
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)

    const flicked = Math.abs(dragRef.current.velocity) > VELOCITY_THRESHOLD
    const target = flicked
      ? dragRef.current.velocity > 0
        ? snapPoints[snapPoints.length - 1]
        : snapPoints[0]
      : nearestSnap(height)

    if (target <= minHeight + 0.02 && dragRef.current.velocity < 0) {
      haptics.trigger('light')
      onClose()
      return
    }
    haptics.trigger('selection')
    setHeight(target)
    setSheetHeight(target)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={ariaLabel ?? title}>
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="animate-sheet-in relative flex flex-col overflow-hidden rounded-t-2xl border-t border-edge bg-panel shadow-2xl"
        style={{ height: `${height * 100}%`, transition: dragging ? 'none' : 'height 240ms cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div
          className="gesture-surface flex shrink-0 cursor-grab flex-col items-center pb-1 pt-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1 w-10 rounded-full bg-edge" aria-hidden />
        </div>
        {title ? (
          <div className="flex shrink-0 items-center justify-between border-b border-edge px-4 py-2">
            <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
            <button type="button" className="btn btn-ghost touch-target" onClick={onClose}>
              Done
            </button>
          </div>
        ) : null}
        <div className="scroll-surface flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-edge px-4 py-2 safe-bottom">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
