import { useCallback, useEffect, useRef, useState } from 'react'

export type UseLongPressOptions = {
  durationMs?: number
  /** Movement beyond this cancels the press. */
  moveTolerancePx?: number
  onLongPress?: () => void
  onCancel?: () => void
}

export type LongPressHandlers = {
  onPointerDown: (event: React.PointerEvent) => void
  onPointerMove: (event: React.PointerEvent) => void
  onPointerUp: (event: React.PointerEvent) => void
  onPointerLeave: (event: React.PointerEvent) => void
  onContextMenu: (event: React.MouseEvent) => void
}

export const useLongPress = (
  options: UseLongPressOptions = {},
): { handlers: LongPressHandlers; pressed: boolean } => {
  const { durationMs = 500, moveTolerancePx = 10, onLongPress, onCancel } = options
  const [pressed, setPressed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = useCallback(
    (cancelled: boolean) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      origin.current = null
      setPressed(false)
      if (cancelled && !fired.current) onCancel?.()
      fired.current = false
    },
    [onCancel],
  )

  useEffect(() => () => clear(false), [clear])

  const handlers: LongPressHandlers = {
    onPointerDown: (event) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return
      origin.current = { x: event.clientX, y: event.clientY }
      fired.current = false
      setPressed(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        fired.current = true
        setPressed(false)
        onLongPress?.()
      }, durationMs)
    },
    onPointerMove: (event) => {
      if (!origin.current || !timer.current) return
      const dx = event.clientX - origin.current.x
      const dy = event.clientY - origin.current.y
      if (Math.hypot(dx, dy) > moveTolerancePx) clear(true)
    },
    onPointerUp: () => clear(true),
    onPointerLeave: () => clear(true),
    onContextMenu: (event) => event.preventDefault(),
  }

  return { handlers, pressed }
}
