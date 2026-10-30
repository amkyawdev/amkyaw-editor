import { useCallback } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'
import { CanvasSurface } from './CanvasSurface'
import { framesToTimecode } from '@/lib/time'
import { usePlayback } from '@/hooks/usePlayback'

export type ViewportPanelProps = {
  className?: string
}

/** Desktop preview: canvas plus a transport bar. */
export const ViewportPanel = ({ className }: ViewportPanelProps) => {
  const resolution = useProjectStore((state) => state.project.resolution)
  const fps = useProjectStore((state) => state.project.fps)
  const durationFrames = useProjectStore((state) => state.project.durationFrames)
  const currentFrame = useEditorStore((state) => state.currentFrame)
  const playing = useEditorStore((state) => state.playing)
  const zoom = useEditorStore((state) => state.timelineZoom)
  const toggleGrid = useEditorStore((state) => state.toggleGrid)
  const gridVisible = useEditorStore((state) => state.gridVisible)
  const { toggle, stepBy, seek } = usePlayback()

  const onScrub = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      seek(Number(event.target.value))
    },
    [seek],
  )

  return (
    <section className={`flex min-h-0 flex-col ${className ?? ''}`} aria-label="Preview">
      <div className="flex items-center justify-between border-b border-edge px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="label">Preview</span>
          <span className="chip">
            {resolution.width}×{resolution.height}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleGrid}
          aria-pressed={gridVisible}
          className={`chip ${gridVisible ? 'border-accent text-accent' : ''}`}
        >
          Grid
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-4">
        <CanvasSurface className="h-full w-full" />
      </div>

      <div className="flex items-center gap-3 border-t border-edge px-3 py-2">
        <button type="button" className="btn touch-target" onClick={() => stepBy(-1)} aria-label="Step back">
          ⏮
        </button>
        <button type="button" className="btn btn-primary touch-target" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="btn touch-target" onClick={() => stepBy(1)} aria-label="Step forward">
          ⏭
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(0, durationFrames)}
          value={currentFrame}
          onChange={onScrub}
          className="h-1 flex-1 cursor-pointer accent-accent"
          aria-label="Scrub timeline"
        />

        <span className="w-28 text-right font-mono text-xs tabular-nums text-slate-300">
          {framesToTimecode(currentFrame, fps)}
        </span>
        <span className="chip">{Math.round(zoom * 100)}%</span>
      </div>
    </section>
  )
}
