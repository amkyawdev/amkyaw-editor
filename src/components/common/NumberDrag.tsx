import { useCallback, useRef, useState } from 'react'
import { throttle } from '@/lib/throttle'

export type NumberDragProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Pixels of travel required to move one `step`. */
  pixelsPerStep?: number
  label?: string
  suffix?: string
  precision?: number
  disabled?: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Scrub-to-change numeric field. Dragging horizontally is far more accurate
 * than tapping +/- on a phone, and works identically with a mouse.
 */
export const NumberDrag = ({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  pixelsPerStep = 4,
  label,
  suffix = '',
  precision = 2,
  disabled = false,
}: NumberDragProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const startRef = useRef({ x: 0, value: 0 })
  const dragging = useRef(false)

  const emit = useCallback(
    (next: number) => onChange(clamp(next, min, max)),
    [onChange, min, max],
  )

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || editing) return
    dragging.current = true
    startRef.current = { x: event.clientX, value }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = useCallback(
    throttle((event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current || disabled) return
      const deltaSteps = (event.clientX - startRef.current.x) / pixelsPerStep
      const raw = startRef.current.value + deltaSteps * step
      emit(Math.round(raw / step) * step)
    }, 16),
    [disabled, emit, pixelsPerStep, step],
  )

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const commit = () => {
    const parsed = Number.parseFloat(draft)
    if (Number.isFinite(parsed)) emit(parsed)
    setEditing(false)
  }

  return (
    <div
      className={`flex select-none items-center gap-2 rounded-lg border border-edge bg-[#0f1117] px-2 py-1.5 ${
        disabled ? 'opacity-50' : 'cursor-ew-resize'
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => {
        setDraft(String(Number(value.toFixed(precision))))
        setEditing(true)
      }}
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={label}
      tabIndex={0}
    >
      {label ? <span className="label shrink-0">{label}</span> : null}
      {editing ? (
        <input
          className="w-full bg-transparent text-right text-sm tabular-nums outline-none"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <span className="w-full text-right text-sm tabular-nums">
          {Number(value.toFixed(precision))}
          {suffix}
        </span>
      )}
    </div>
  )
}
