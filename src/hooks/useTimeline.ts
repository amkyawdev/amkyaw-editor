import { useCallback, useMemo } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useEditorStore, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM } from '@/store/editorStore'
import { clamp } from '@/lib/math'

export const PIXELS_PER_FRAME_BASE = 8

export type TimelineMetrics = {
  pixelsPerFrame: number
  contentWidth: number
  visibleFrames: number
  frameToX: (frame: number) => number
  xToFrame: (x: number) => number
}

export type UseTimelineResult = {
  metrics: TimelineMetrics
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: (viewportWidth: number) => void
  setZoom: (zoom: number) => void
}

export const useTimeline = (viewportWidth = 0): UseTimelineResult => {
  const durationFrames = useProjectStore((state) => state.project.durationFrames)
  const zoom = useEditorStore((state) => state.timelineZoom)
  const setTimelineZoom = useEditorStore((state) => state.setTimelineZoom)

  const metrics = useMemo<TimelineMetrics>(() => {
    const pixelsPerFrame = PIXELS_PER_FRAME_BASE * zoom
    return {
      pixelsPerFrame,
      contentWidth: durationFrames * pixelsPerFrame,
      visibleFrames: pixelsPerFrame > 0 ? viewportWidth / pixelsPerFrame : durationFrames,
      frameToX: (frame: number) => frame * pixelsPerFrame,
      xToFrame: (x: number) => (pixelsPerFrame > 0 ? x / pixelsPerFrame : 0),
    }
  }, [durationFrames, zoom, viewportWidth])

  const zoomIn = useCallback(() => setTimelineZoom(useEditorStore.getState().timelineZoom * 1.25), [setTimelineZoom])
  const zoomOut = useCallback(() => setTimelineZoom(useEditorStore.getState().timelineZoom / 1.25), [setTimelineZoom])

  const zoomToFit = useCallback(
    (width: number) => {
      if (width <= 0 || durationFrames <= 0) return
      const pixelsPerFrame = width / durationFrames
      setTimelineZoom(clamp(pixelsPerFrame / PIXELS_PER_FRAME_BASE, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM))
    },
    [durationFrames, setTimelineZoom],
  )

  const setZoom = useCallback(
    (next: number) => setTimelineZoom(clamp(next, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM)),
    [setTimelineZoom],
  )

  return { metrics, zoomIn, zoomOut, zoomToFit, setZoom }
}
