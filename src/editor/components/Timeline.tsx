import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Film, Music, Scissors, Shapes, Trash2, Type, Eye, EyeOff } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { LAYER_COLORS, type LayerKind } from '../types'
import { haptics } from '@/mobile/haptics'
import { throttle } from '@/lib/throttle'

const GUTTER = 48
const RULER = 22
const ROW = 40
const MIN_PX_PER_SEC = 18

const KIND_ICON: Record<LayerKind, typeof Film> = {
  video: Film,
  audio: Music,
  text: Type,
  shape: Shapes,
}

export type ContextMenuState = {
  clipId: string
  x: number
  y: number
} | null

export type TimelineProps = {
  onContextMenu: (state: ContextMenuState) => void
}

/**
 * Horizontal timeline. The ruler is the scrub surface; clips are draggable via
 * long-press context menu and split at the playhead. The label gutter is fixed
 * so layer identity never scrolls out of view.
 */
export const Timeline = ({ onContextMenu }: TimelineProps) => {
  const layers = useEditorStore((state) => state.layers)
  const clips = useEditorStore((state) => state.clips)
  const duration = useEditorStore((state) => state.duration)
  const currentTime = useEditorStore((state) => state.currentTime)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const setPlaying = useEditorStore((state) => state.setPlaying)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const selectedClipId = useEditorStore((state) => state.selectedClipId)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const selectClip = useEditorStore((state) => state.selectClip)
  const toggleLayerVisibility = useEditorStore((state) => state.toggleLayerVisibility)
  const moveClip = useEditorStore((state) => state.moveClip)
  const zoom = useEditorStore((state) => state.zoom)

  const scrollRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressOrigin = useRef({ x: 0, y: 0 })
  const dragState = useRef<{ clipId: string; startX: number; originStart: number } | null>(null)
  // Set on drag end and cleared on the next tick, because `onClick` fires
  // after `onPointerUp` and would otherwise re-select the dragged clip.
  const suppressClick = useRef(false)
  const [contentWidth, setContentWidth] = useState(0)

  // Timeline density scales with the viewport, then with user zoom.
  const pxPerSecond = useMemo(() => {
    const base = contentWidth > 0 ? contentWidth / duration : MIN_PX_PER_SEC
    return Math.max(MIN_PX_PER_SEC, base * zoom)
  }, [contentWidth, duration, zoom])

  const trackWidth = Math.max(contentWidth, duration * pxPerSecond)

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => setContentWidth(entries[0]?.contentRect.width ?? 0))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const scrubTo = useMemo(
    () =>
      throttle((clientX: number) => {
        const ruler = rulerRef.current
        if (!ruler) return
        const rect = ruler.getBoundingClientRect()
        const ratio = (clientX - rect.left) / Math.max(1, rect.width)
        setCurrentTime(ratio * duration)
        haptics.trigger('selection')
      }, 40),
    [duration, setCurrentTime],
  )

  useEffect(() => () => scrubTo.cancel(), [scrubTo])

  const onRulerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      scrubbing.current = true
      setPlaying(false)
      event.currentTarget.setPointerCapture(event.pointerId)
      const rect = event.currentTarget.getBoundingClientRect()
      setCurrentTime(((event.clientX - rect.left) / Math.max(1, rect.width)) * duration)
    },
    [duration, setCurrentTime, setPlaying],
  )

  const onRulerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing.current) return
    scrubTo(event.clientX)
  }

  const onRulerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    scrubbing.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const ticks = useMemo(() => {
    const step = duration <= 15 ? 2 : duration <= 40 ? 5 : 10
    const marks: number[] = []
    for (let t = 0; t <= duration; t += step) marks.push(t)
    return marks
  }, [duration])

  const playheadX = (currentTime / duration) * trackWidth

  return (
    <section
      className="relative flex shrink-0 flex-col border-t border-edge bg-surface1"
      style={{ height: 'var(--timeline-height)' }}
      aria-label="Timeline"
    >
      <div className="flex min-h-0 flex-1">
        {/* Fixed gutter */}
        <div className="z-20 shrink-0 border-r border-edge bg-surface1" style={{ width: GUTTER }}>
          <div style={{ height: RULER }} className="border-b border-edge" />
          <div className="scroll-y" style={{ maxHeight: `calc(100% - ${RULER}px)` }}>
            {layers.map((layer) => {
              const Icon = KIND_ICON[layer.kind]
              const active = layer.id === selectedLayerId
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => {
                    haptics.trigger('light')
                    selectLayer(layer.id)
                  }}
                  className="flex w-full items-center justify-center border-b border-edge/60 pressable"
                  style={{ height: ROW }}
                  aria-label={`${layer.name} layer`}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-[8px]"
                    style={{
                      backgroundColor: active ? `${LAYER_COLORS[layer.kind]}33` : 'transparent',
                      color: active ? LAYER_COLORS[layer.kind] : '#8B8B9E',
                    }}
                  >
                    <Icon size={14} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrolling tracks */}
        <div ref={scrollRef} className="scroll-x relative min-w-0 flex-1">
          <div className="relative" style={{ width: trackWidth, minWidth: '100%' }}>
            {/* Ruler */}
            <div
              ref={rulerRef}
              className="gesture-surface sticky top-0 z-10 border-b border-edge bg-surface1"
              style={{ height: RULER }}
              onPointerDown={onRulerDown}
              onPointerMove={onRulerMove}
              onPointerUp={onRulerUp}
              onPointerCancel={onRulerUp}
            >
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute top-0 flex h-full items-center pl-1 font-mono text-micro text-muted"
                  style={{ left: (t / duration) * trackWidth }}
                >
                  {t}s
                </span>
              ))}
            </div>

            {/* Track rows */}
            <div className="scroll-y" style={{ maxHeight: `calc(100% - ${RULER}px)` }}>
              {layers.map((layer) => {
                const rowClips = clips.filter((clip) => clip.layerId === layer.id)
                return (
                  <div
                    key={layer.id}
                    className="relative border-b border-edge/60"
                    style={{ height: ROW }}
                  >
                    {rowClips.map((clip) => {
                      const left = (clip.start / duration) * trackWidth
                      const width = Math.max(12, ((clip.end - clip.start) / duration) * trackWidth)
                      const active = clip.id === selectedClipId
                      return (
                        <motion.button
                          key={clip.id}
                          type="button"
                          whileTap={{ scale: 1.02 }}
                          onPointerDown={(event) => {
                            // Long-press opens the context menu; horizontal
                            // travel past the threshold turns the press into a
                            // drag-move instead.
                            longPressOrigin.current = { x: event.clientX, y: event.clientY }
                            dragState.current = {
                              clipId: clip.id,
                              startX: event.clientX,
                              originStart: clip.start,

                            }
                            event.currentTarget.setPointerCapture(event.pointerId)
                            const rect = event.currentTarget.getBoundingClientRect()
                            clearLongPress()
                            longPressTimer.current = setTimeout(() => {
                              haptics.trigger('warning')
                              onContextMenu({
                                clipId: clip.id,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              })
                            }, 480)
                          }}
                          onPointerMove={(event) => {
                            const drag = dragState.current
                            if (!drag || drag.clipId !== clip.id) return
                            const dx = event.clientX - drag.startX
                            const moved = Math.abs(dx) > 8 || Math.abs(event.clientY - longPressOrigin.current.y) > 8
                            if (moved) clearLongPress()
                            if (Math.abs(dx) > 8) {
                              moveClip(clip.id, drag.originStart + dx / pxPerSecond)
                            }
                          }}
                          onPointerUp={(event) => {
                            clearLongPress()
                            event.currentTarget.releasePointerCapture?.(event.pointerId)
                            const drag = dragState.current
                            if (drag && drag.clipId === clip.id && Math.abs(event.clientX - drag.startX) > 8) {
                              suppressClick.current = true
                              setTimeout(() => {
                                suppressClick.current = false
                              }, 0)
                            }
                            dragState.current = null
                          }}
                          onPointerLeave={() => clearLongPress()}
                          onClick={() => {
                            // A completed drag ends in a click; do not treat it
                            // as a selection tap.
                            if (suppressClick.current) return
                            haptics.trigger('light')
                            selectClip(clip.id)
                            selectLayer(clip.layerId)
                          }}
                          className={`absolute inset-y-1 overflow-hidden rounded-[8px] border text-left ${
                            active ? 'border-white/70' : 'border-white/10'
                          }`}
                          style={{
                            left,
                            width,
                            backgroundColor: `${LAYER_COLORS[layer.kind]}CC`,
                            opacity: layer.visible ? 1 : 0.35,
                            boxShadow: active
                              ? '0 10px 28px rgba(0,0,0,0.6)'
                              : '0 4px 12px rgba(0,0,0,0.45)',
                          }}
                          aria-label={`${clip.label} clip`}
                        >
                          <span className="block truncate px-1.5 text-micro font-label leading-[32px] text-white/95">
                            {clip.label}
                          </span>
                          {/* Trim handles appear on the selected clip */}
                          {active ? (
                            <>
                              <span className="absolute inset-y-1.5 left-0.5 w-1 rounded-pill bg-white/85" />
                              <span className="absolute inset-y-1.5 right-0.5 w-1 rounded-pill bg-white/85" />
                            </>
                          ) : null}
                        </motion.button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Playhead */}
            <div
              className="pointer-events-none absolute top-0 z-30 w-0.5 bg-secondary"
              style={{
                left: playheadX,
                height: RULER + layers.length * ROW,
                boxShadow: '0 0 12px rgba(6,182,212,0.9)',
              }}
            >
              <span
                className="absolute -left-[5px] top-0 h-3 w-3 rounded-pill bg-secondary"
                style={{ boxShadow: '0 0 12px rgba(6,182,212,0.9)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visibility toggles live on the footer so they stay reachable */}
      <div className="flex items-center gap-1 border-t border-edge px-2 py-1">
        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => {
              haptics.trigger('light')
              toggleLayerVisibility(layer.id)
            }}
            className="flex items-center gap-1 rounded-pill bg-surface2 px-2 py-0.5 text-micro font-label text-muted pressable"
            aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
          >
            {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
            <span className="max-w-[64px] truncate">{layer.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export const CLIP_MENU_ACTIONS = [
  { id: 'duplicate', label: 'Duplicate', icon: Copy },
  { id: 'split', label: 'Split at playhead', icon: Scissors },
  { id: 'delete', label: 'Delete', icon: Trash2, danger: true },
] as const
