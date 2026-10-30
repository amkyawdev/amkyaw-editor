import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'
import { useUiStore } from '@/store/uiStore'
import { usePlayback } from '@/hooks/usePlayback'
import { performanceMonitor } from '@/mobile/performance-monitor'
import { PinchViewport } from '@/components/mobile/PinchViewport'
import { CanvasSurface } from './CanvasSurface'

/**
 * Mobile preview stage. Combines pinch/pan zoom, playback controls and a live
 * performance readout. The readout is only shown when the frame budget is
 * actually being missed, so it does not add noise on capable devices.
 */
export const MobileViewport = () => {
  const resolution = useProjectStore((state) => state.project.resolution)
  const currentFrame = useEditorStore((state) => state.currentFrame)
  const durationFrames = useProjectStore((state) => state.project.durationFrames)
  const playing = useEditorStore((state) => state.playing)
  const setPlaying = useEditorStore((state) => state.setPlaying)
  const stepFrames = useEditorStore((state) => state.stepFrames)
  const pushToast = useUiStore((state) => state.pushToast)
  const { toggle } = usePlayback()

  const [stats, setStats] = useState(() => performanceMonitor.getStats())
  const lastFrameTime = useRef(0)

  useEffect(() => {
    performanceMonitor.start()
    const unsubscribe = performanceMonitor.subscribe(setStats)
    return () => {
      unsubscribe()
      performanceMonitor.stop()
    }
  }, [])

  useEffect(() => {
    const now = performance.now()
    if (lastFrameTime.current > 0) performanceMonitor.record(now - lastFrameTime.current)
    lastFrameTime.current = now
  }, [currentFrame])

  const aspect = useMemo(
    () => (resolution.height > 0 ? resolution.width / resolution.height : 16 / 9),
    [resolution],
  )

  const progress = durationFrames > 0 ? currentFrame / durationFrames : 0

  const seekRelative = useCallback(
    (delta: number) => {
      stepFrames(delta)
    },
    [stepFrames],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1">
        <PinchViewport aspect={aspect} className="h-full w-full">
          <CanvasSurface className="h-full w-full" />
        </PinchViewport>

        {stats.degraded ? (
          <button
            type="button"
            onClick={() =>
              pushToast(
                `Preview degraded — ${Math.round(stats.averageFps)} fps. Reduce effects or hide layers.`,
                'error',
              )
            }
            className="absolute left-2 top-2 rounded-full bg-danger/20 px-2 py-1 text-[10px] font-medium text-danger"
          >
            {Math.round(stats.averageFps)} fps
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-edge bg-panel px-3 py-2">
        <button
          type="button"
          className="touch-target rounded-lg text-slate-300"
          onClick={() => seekRelative(-1)}
          aria-label="Previous frame"
        >
          ◀
        </button>
        <button
          type="button"
          className="touch-target rounded-lg bg-accent text-white"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          className="touch-target rounded-lg text-slate-300"
          onClick={() => seekRelative(1)}
          aria-label="Next frame"
        >
          ▶
        </button>

        <div className="relative mx-1 h-8 flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, durationFrames)}
            value={currentFrame}
            onChange={(event) => {
              setPlaying(false)
              useEditorStore.getState().setCurrentFrame(Number(event.target.value))
            }}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
            aria-label="Scrub"
          />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-edge">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
