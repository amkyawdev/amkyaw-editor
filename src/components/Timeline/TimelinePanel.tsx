import { useEffect, useRef, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'
import { useTimeline } from '@/hooks/useTimeline'
import { framesToTimecode } from '@/lib/time'

const ROW_HEIGHT = 44
const HEADER_HEIGHT = 28
const GUTTER = 168

/** Desktop timeline: rulers, layer tracks, keyframe diamonds and a playhead. */
export const TimelinePanel = () => {
  const fps = useProjectStore((state) => state.project.fps)
  const durationFrames = useProjectStore((state) => state.project.durationFrames)
  const layers = useProjectStore((state) => state.project.layers)
  const keyframeTracks = useProjectStore((state) => state.project.keyframeTracks)

  const currentFrame = useEditorStore((state) => state.currentFrame)
  const setCurrentFrame = useEditorStore((state) => state.setCurrentFrame)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const selectedKeyframes = useEditorStore((state) => state.selectedKeyframes)
  const toggleKeyframeSelection = useEditorStore((state) => state.toggleKeyframeSelection)
  const snapping = useEditorStore((state) => state.snapping)
  const setSnapping = useEditorStore((state) => state.setSnapping)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const { metrics, zoomIn, zoomOut, zoomToFit } = useTimeline(width)

  useEffect(() => {
    const node = scrollerRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? 0))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const percent = (frame: number) => `${(frame / Math.max(1, durationFrames)) * 100}%`

  const frameFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = scrollerRef.current
    if (!node) return 0
    const rect = node.getBoundingClientRect()
    const x = event.clientX - rect.left + node.scrollLeft
    const raw = metrics.xToFrame(x)
    return snapping ? Math.round(raw) : Math.round(raw)
  }

  const ticks = (() => {
    const step = Math.max(1, Math.round(durationFrames / 20))
    const marks: number[] = []
    for (let frame = 0; frame <= durationFrames; frame += step) marks.push(frame)
    return marks
  })()

  return (
    <section className="flex min-h-0 flex-col border-t border-edge bg-panel" aria-label="Timeline">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-1.5">
        <span className="label">Timeline</span>
        <span className="font-mono text-xs tabular-nums text-accent">{framesToTimecode(currentFrame, fps)}</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className="chip" onClick={zoomOut} aria-label="Zoom out">
            −
          </button>
          <button type="button" className="chip" onClick={zoomIn} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="chip" onClick={() => zoomToFit(width)}>
            Fit
          </button>
          <button
            type="button"
            className={`chip ${snapping ? 'border-accent text-accent' : ''}`}
            aria-pressed={snapping}
            onClick={() => setSnapping(!snapping)}
          >
            Snap
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="shrink-0 border-r border-edge bg-panel" style={{ width: GUTTER }}>
          <div style={{ height: HEADER_HEIGHT }} className="border-b border-edge" />
          <div className="scroll-surface max-h-[calc(100%-28px)] overflow-y-auto">
            {layers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => selectLayer(layer.id)}
                className={`flex w-full items-center gap-2 border-b border-edge/50 px-2 text-left text-xs ${
                  selectedLayerId === layer.id ? 'bg-accentSoft/30 text-accent' : 'text-slate-400'
                }`}
                style={{ height: ROW_HEIGHT }}
              >
                <span className="truncate">{layer.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollerRef} className="relative min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ width: Math.max(width, metrics.contentWidth), minWidth: '100%' }}>
            <div
              className="gesture-surface sticky top-0 z-10 border-b border-edge bg-[#0d0f14]"
              style={{ height: HEADER_HEIGHT }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                setCurrentFrame(frameFromEvent(event))
              }}
              onPointerMove={(event) => {
                if (event.buttons !== 1) return
                setCurrentFrame(frameFromEvent(event))
              }}
            >
              {ticks.map((frame) => (
                <span
                  key={frame}
                  className="absolute top-0 h-full border-l border-edge/60 pl-1 font-mono text-[9px] leading-[28px] text-slate-500"
                  style={{ left: percent(frame) }}
                >
                  {frame}
                </span>
              ))}
            </div>

            <div className="scroll-surface max-h-[calc(100%-28px)] overflow-y-auto">
              {layers.map((layer) => (
                <div key={layer.id} className="relative border-b border-edge/50" style={{ height: ROW_HEIGHT }}>
                  <div
                    className="absolute inset-y-1.5 rounded-md border border-accent/40 bg-accentSoft/50"
                    style={{
                      left: percent(layer.startFrame),
                      width: `${((layer.endFrame - layer.startFrame + 1) / Math.max(1, durationFrames)) * 100}%`,
                    }}
                  />
                  {keyframeTracks
                    .filter((track) => track.layerId === layer.id)
                    .flatMap((track) =>
                      track.keyframes.map((keyframe) => (
                        <button
                          key={keyframe.id}
                          type="button"
                          title={`${track.property} @ ${keyframe.frame}`}
                          aria-label={`Keyframe ${track.property} at ${keyframe.frame}`}
                          className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border ${
                            selectedKeyframes.includes(keyframe.id)
                              ? 'border-white bg-accent'
                              : 'border-accent bg-panel'
                          }`}
                          style={{ left: percent(keyframe.frame) }}
                          onClick={() => toggleKeyframeSelection(keyframe.id)}
                        />
                      )),
                    )}
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-accent" style={{ left: percent(currentFrame) }}>
              <span className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
