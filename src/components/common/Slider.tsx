import { useCallback, useRef } from 'react'

export type SliderProps = {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  onCommit?: (value: number) => void
  label?: string
  format?: (value: number) => string
  disabled?: boolean
}

/**
 * Custom range control. A native `<input type=range>` is unusable for
 * frame-accurate scrubbing on touch because the thumb is only ~20px wide, so
 * the whole track is the hit area here.
 */
export const Slider = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  label,
  format,
  disabled = false,
}: SliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const ratio = max > min ? (value - min) / (max - min) : 0

  const valueFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return value
      const rect = track.getBoundingClientRect()
      const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const raw = min + t * (max - min)
      return Math.round(raw / step) * step
    },
    [max, min, step, value],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    onChange(valueFromEvent(event.clientX))
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || disabled) return
    onChange(valueFromEvent(event.clientX))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    onCommit?.(valueFromEvent(event.clientX))
  }

  return (
    <div className={disabled ? 'opacity-50' : undefined}>
      {label || format ? (
        <div className="mb-1 flex items-center justify-between">
          {label ? <span className="label">{label}</span> : null}
          <span className="text-xs tabular-nums text-slate-400">
            {format ? format(value) : value}
          </span>
        </div>
      ) : null}
      <div
        ref={trackRef}
        className="gesture-surface relative flex h-8 items-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={0}
      >
        <div className="h-1.5 w-full rounded-full bg-edge">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-accent shadow"
          style={{ left: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
        />
      </div>
    </div>
  )
}
