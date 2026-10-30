import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { useProjectStore } from '@/store/projectStore'
import { useUiStore } from '@/store/uiStore'
import { framesToTimecode } from '@/lib/time'
import { haptics } from '@/mobile/haptics'
import { throttle } from '@/lib/throttle'
import type { Layer } from '@/types/layer'

export type TouchTimelineProps = {
  height?: number
}

const RULER_HEIGHT = 24
const ROW_HEIGHT = 36
const LABEL_WIDTH = 76

/**
 * Touch-scrubbable timeline. The ruler is the scrub surface: dragging anywhere
 * on it moves the playhead. The label gutter is sticky so layer names stay
 * visible while the track area scrolls horizontally.
 */
export const TouchTimeline = ({ height = 200 }: TouchTimelineProps) => {
  const fps = useProjectStore((state) => state.project.fps)
  const durationFrames = useProjectStore((state) => state.project.durationFrames)
  const layers = useProjectStore((state) => state.project.layers)
  const currentFrame = useEditorStore((state) => state.currentFrame)
  const setCurrentFrame = useEditorStore((state) => state.setCurrentFrame)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const openSheet = useUiStore((state) => state.openSheet)

  const rulerRef = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)

  const frameFromClientX = useCallback(
    (clientX: number) => {
      const ruler = rulerRef.current
      if (!ruler) return 0
      const rect = ruler.getBoundingClientRect()
      const ratio = (clientX - rect.left) / Math.max(1, rect.width)
      return Math.round(Math.min(1, Math.max(0, ratio)) * durationFrames)
    },
    [durationFrames],
  )

  const scrub = useMemo(
    () =>
      throttle((clientX: number) => {
        setCurrentFrame(frameFromClientX(clientX))
        haptics.trigger('selection')
      }, 40),
    [frameFromClientX, setCurrentFrame],
  )

  useEffect(() => () => scrub.cancel(), [scrub])

  const onRulerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    scrubbing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    setCurrentFrame(frameFromClientX(event.clientX))
  }

  const onRulerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing.current) return
    scrub(event.clientX)
  }

  const onRulerPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    scrubbing.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const ticks = useMemo(() => {
    const step = Math.max(1, Math.round(durationFrames / 10))
    const marks: number[] = []
    for (let frame = 0; frame <= durationFrames; frame += step) marks.push(frame)
    return marks
  }, [durationFrames])

  const percent = (frame: number) => `${(frame / Math.max(1, durationFrames)) * 100}%`

  const onLayerPress = (layer: Layer) => {
    haptics.trigger('light')
    selectLayer(layer.id)
    openSheet('properties')
  }

  return (
    <section className="panel-alt flex flex-col overflow-hidden" style={{ height }} aria-label="Timeline">
      <div className="flex items-center justify-between border-b border-edge px-3 py-1">
        <span className="font-mono text-xs tabular-nums text-accent">{framesToTimecode(currentFrame, fps)}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {durationFrames} frames · {fps} fps
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="z-10 shrink-0 border-r border-edge bg-panel" style={{ width: LABEL_WIDTH }}>
          <div style={{ height: RULER_HEIGHT }} />
          <div className="scroll-surface max-h-[calc(100%-24px)] overflow-y-auto">
            {layers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => onLayerPress(layer)}
                className={`flex w-full items-center border-b border-edge/50 px-2 text-left text-[11px] ${
                  selectedLayerId === layer.id ? 'bg-accentSoft/40 text-accent' : 'text-slate-400'
                }`}
                style={{ height: ROW_HEIGHT }}
              >
                <span className="truncate">{layer.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ minWidth: '100%' }}>
            <div
              ref={rulerRef}
              className="gesture-surface relative border-b border-edge bg-[#0d0f14]"
              style={{ height: RULER_HEIGHT }}
              onPointerDown={onRulerPointerDown}
              onPointerMove={onRulerPointerMove}
              onPointerUp={onRulerPointerUp}
              onPointerCancel={onRulerPointerUp}
            >
              {ticks.map((frame) => (
                <span
                  key={frame}
                  className="absolute top-0 h-full border-l border-edge/60 pl-1 font-mono text-[9px] leading-[24px] text-slate-500"
                  style={{ left: percent(frame) }}
                >
                  {frame}
                </span>
              ))}
            </div>

            <div className="scroll-surface max-h-[calc(100%-24px)] overflow-y-auto">
              {layers.map((layer) => (
                <div key={layer.id} className="relative border-b border-edge/50" style={{ height: ROW_HEIGHT }}>
                  <div
                    className="absolute inset-y-1 rounded-md bg-accentSoft/60"
                    style={{
                      left: percent(layer.startFrame),
                      width: `${((layer.endFrame - layer.startFrame + 1) / Math.max(1, durationFrames)) * 100}%`,
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent" style={{ left: percent(currentFrame) }}>
              <span className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
