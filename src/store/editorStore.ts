import { create } from 'zustand'
import { clamp } from '@/lib/math'

export type ToolName = 'select' | 'hand' | 'text' | 'shape' | 'cut' | 'transform'

export type EditorState = {
  currentFrame: number
  playing: boolean
  playbackRate: number
  loop: boolean
  tool: ToolName
  selectedLayerId: string | null
  selectedLayerIds: string[]
  selectedKeyframes: string[]
  timelineZoom: number
  timelineScrollFrames: number
  snapping: boolean
  gridVisible: boolean
  snappingThresholdPx: number
  setCurrentFrame: (frame: number) => void
  stepFrames: (delta: number) => void
  setPlaying: (playing: boolean) => void
  togglePlayback: () => void
  setPlaybackRate: (rate: number) => void
  setLoop: (loop: boolean) => void
  setTool: (tool: ToolName) => void
  selectLayer: (id: string | null, additive?: boolean) => void
  selectKeyframes: (ids: string[]) => void
  toggleKeyframeSelection: (id: string) => void
  setTimelineZoom: (zoom: number) => void
  zoomTimeline: (delta: number) => void
  setTimelineScroll: (frames: number) => void
  setSnapping: (snapping: boolean) => void
  toggleGrid: () => void
}

export const MIN_TIMELINE_ZOOM = 0.05
export const MAX_TIMELINE_ZOOM = 8

export const useEditorStore = create<EditorState>((set, get) => ({
  currentFrame: 0,
  playing: false,
  playbackRate: 1,
  loop: true,
  tool: 'select',
  selectedLayerId: null,
  selectedLayerIds: [],
  selectedKeyframes: [],
  timelineZoom: 1,
  timelineScrollFrames: 0,
  snapping: true,
  gridVisible: false,
  snappingThresholdPx: 8,

  setCurrentFrame: (frame) => set({ currentFrame: Math.max(0, Math.round(frame)) }),

  stepFrames: (delta) => set({ currentFrame: Math.max(0, get().currentFrame + delta) }),

  setPlaying: (playing) => set({ playing }),

  togglePlayback: () => set({ playing: !get().playing }),

  setPlaybackRate: (rate) => set({ playbackRate: clamp(rate, 0.1, 4) }),

  setLoop: (loop) => set({ loop }),

  setTool: (tool) => set({ tool }),

  selectLayer: (id, additive = false) =>
    set((state) => {
      if (id === null) return { selectedLayerId: null, selectedLayerIds: [] }
      if (!additive) return { selectedLayerId: id, selectedLayerIds: [id] }
      const exists = state.selectedLayerIds.includes(id)
      const next = exists
        ? state.selectedLayerIds.filter((existing) => existing !== id)
        : [...state.selectedLayerIds, id]
      return { selectedLayerIds: next, selectedLayerId: next[next.length - 1] ?? null }
    }),

  selectKeyframes: (ids) => set({ selectedKeyframes: ids }),

  toggleKeyframeSelection: (id) =>
    set((state) => ({
      selectedKeyframes: state.selectedKeyframes.includes(id)
        ? state.selectedKeyframes.filter((existing) => existing !== id)
        : [...state.selectedKeyframes, id],
    })),

  setTimelineZoom: (zoom) =>
    set({ timelineZoom: clamp(zoom, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM) }),

  zoomTimeline: (delta) =>
    set((state) => ({
      timelineZoom: clamp(state.timelineZoom * delta, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM),
    })),

  setTimelineScroll: (frames) => set({ timelineScrollFrames: Math.max(0, frames) }),

  setSnapping: (snapping) => set({ snapping }),

  toggleGrid: () => set({ gridVisible: !get().gridVisible }),
}))
