import { create } from 'zustand'
import {
  CANVAS_RESOLUTION,
  PROJECT_DURATION,
  PROJECT_FPS,
  PROJECT_NAME,
  SAMPLE_APPLIED_EFFECTS,
  SAMPLE_CLIPS,
  SAMPLE_LAYERS,
} from './mockData'
import type { AppliedEffect, Clip, Layer, LayerKind, SheetId, Toast } from './types'

const HISTORY_LIMIT = 40

export type EditorSnapshot = {
  layers: Layer[]
  clips: Clip[]
  appliedEffects: AppliedEffect[]
}

export type EditorState = {
  // Project
  projectName: string
  duration: number
  fps: number
  resolution: { width: number; height: number }

  // Content
  layers: Layer[]
  clips: Clip[]
  appliedEffects: AppliedEffect[]

  // Transport
  currentTime: number
  playing: boolean
  zoom: number

  // Selection / UI
  selectedLayerId: string | null
  selectedClipId: string | null
  sheet: SheetId
  toasts: Toast[]
  loading: boolean

  // History
  past: EditorSnapshot[]
  future: EditorSnapshot[]

  // Actions
  setProjectName: (name: string) => void
  setCurrentTime: (seconds: number) => void
  setPlaying: (playing: boolean) => void
  togglePlayback: () => void
  setZoom: (zoom: number) => void

  selectLayer: (id: string | null) => void
  selectClip: (id: string | null) => void
  openSheet: (sheet: SheetId) => void
  closeSheet: () => void

  addLayer: (kind: LayerKind) => Layer
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  updateLayerTransform: (id: string, patch: Partial<Layer['transform']>) => void

  addEffect: (effectId: string, name: string) => void
  toggleEffect: (id: string) => void
  removeEffect: (id: string) => void
  setEffectIntensity: (id: string, intensity: number) => void

  splitClip: (clipId: string, atSeconds: number) => void
  duplicateClip: (clipId: string) => void
  removeClip: (clipId: string) => void
  moveClip: (clipId: string, start: number) => void

  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  setLoading: (loading: boolean) => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

let idSeq = 0
const nextId = (prefix: string) => `${prefix}_${(idSeq += 1)}`

const snapshot = (state: EditorState): EditorSnapshot => ({
  layers: state.layers,
  clips: state.clips,
  appliedEffects: state.appliedEffects,
})

const LAYER_NAMES: Record<LayerKind, string> = {
  video: 'New Clip',
  audio: 'New Audio',
  text: 'New Text',
  shape: 'New Shape',
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** Records history then applies a content mutation. */
  const commit = (mutate: (state: EditorState) => Partial<EditorState>) =>
    set((state) => {
      const past = [...state.past, snapshot(state)]
      return {
        ...mutate(state),
        past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
        future: [],
      }
    })

  return {
    projectName: PROJECT_NAME,
    duration: PROJECT_DURATION,
    fps: PROJECT_FPS,
    resolution: CANVAS_RESOLUTION,

    layers: SAMPLE_LAYERS,
    clips: SAMPLE_CLIPS,
    appliedEffects: SAMPLE_APPLIED_EFFECTS,

    currentTime: 5.24,
    playing: false,
    zoom: 1,

    selectedLayerId: 'lyr_video',
    selectedClipId: null,
    sheet: null,
    toasts: [],
    loading: false,

    past: [],
    future: [],

    setProjectName: (projectName) => set({ projectName }),

    setCurrentTime: (seconds) =>
      set((state) => ({
        currentTime: Math.min(state.duration, Math.max(0, seconds)),
      })),

    setPlaying: (playing) => set({ playing }),

    togglePlayback: () => set((state) => ({ playing: !state.playing })),

    setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.25, zoom)) }),

    selectLayer: (id) => set({ selectedLayerId: id, selectedClipId: null }),
    selectClip: (id) => set({ selectedClipId: id }),

    openSheet: (sheet) => set({ sheet }),
    closeSheet: () => set({ sheet: null }),

    addLayer: (kind) => {
      const layer: Layer = {
        id: nextId('lyr'),
        name: LAYER_NAMES[kind],
        kind,
        visible: true,
        locked: false,
        start: 0,
        end: kind === 'audio' ? get().duration : 6,
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        opacity: 1,
      }
      const clip: Clip = {
        id: nextId('clp'),
        layerId: layer.id,
        start: layer.start,
        end: layer.end,
        label: layer.name,
      }
      commit(() => ({
        layers: [...get().layers, layer],
        clips: [...get().clips, clip],
        selectedLayerId: layer.id,
      }))
      return layer
    },

    removeLayer: (id) =>
      commit(() => ({
        layers: get().layers.filter((layer) => layer.id !== id),
        clips: get().clips.filter((clip) => clip.layerId !== id),
        selectedLayerId: get().selectedLayerId === id ? null : get().selectedLayerId,
      })),

    duplicateLayer: (id) => {
      const source = get().layers.find((layer) => layer.id === id)
      if (!source) return
      const copy: Layer = { ...source, id: nextId('lyr'), name: `${source.name} copy` }
      commit(() => ({
        layers: [...get().layers, copy],
        clips: [
          ...get().clips,
          ...get()
            .clips.filter((clip) => clip.layerId === id)
            .map((clip) => ({ ...clip, id: nextId('clp'), layerId: copy.id })),
        ],
        selectedLayerId: copy.id,
      }))
    },

    toggleLayerVisibility: (id) =>
      commit(() => ({
        layers: get().layers.map((layer) =>
          layer.id === id ? { ...layer, visible: !layer.visible } : layer,
        ),
      })),

    updateLayer: (id, patch) =>
      commit(() => ({
        layers: get().layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
      })),

    updateLayerTransform: (id, patch) =>
      commit(() => ({
        layers: get().layers.map((layer) =>
          layer.id === id ? { ...layer, transform: { ...layer.transform, ...patch } } : layer,
        ),
      })),

    addEffect: (effectId, name) =>
      commit(() => ({
        appliedEffects: [
          ...get().appliedEffects,
          { id: nextId('ap'), effectId, name, enabled: true, intensity: 50 },
        ],
      })),

    toggleEffect: (id) =>
      commit(() => ({
        appliedEffects: get().appliedEffects.map((effect) =>
          effect.id === id ? { ...effect, enabled: !effect.enabled } : effect,
        ),
      })),

    removeEffect: (id) =>
      commit(() => ({
        appliedEffects: get().appliedEffects.filter((effect) => effect.id !== id),
      })),

    setEffectIntensity: (id, intensity) =>
      set((state) => ({
        appliedEffects: state.appliedEffects.map((effect) =>
          effect.id === id ? { ...effect, intensity } : effect,
        ),
      })),

    splitClip: (clipId, atSeconds) => {
      const clip = get().clips.find((candidate) => candidate.id === clipId)
      if (!clip || atSeconds <= clip.start || atSeconds >= clip.end) return
      commit(() => ({
        clips: [
          ...get().clips.map((candidate) =>
            candidate.id === clipId ? { ...candidate, end: atSeconds } : candidate,
          ),
          { ...clip, id: nextId('clp'), start: atSeconds },
        ],
      }))
    },

    duplicateClip: (clipId) => {
      const clip = get().clips.find((candidate) => candidate.id === clipId)
      if (!clip) return
      const span = clip.end - clip.start
      commit(() => ({
        clips: [
          ...get().clips,
          { ...clip, id: nextId('clp'), start: clip.end, end: Math.min(get().duration, clip.end + span) },
        ],
      }))
    },

    removeClip: (clipId) =>
      commit(() => ({ clips: get().clips.filter((clip) => clip.id !== clipId) })),

    moveClip: (clipId, start) =>
      commit(() => {
        const clip = get().clips.find((candidate) => candidate.id === clipId)
        if (!clip) return {}
        const span = clip.end - clip.start
        const clamped = Math.max(0, Math.min(get().duration - span, start))
        return {
          clips: get().clips.map((candidate) =>
            candidate.id === clipId ? { ...candidate, start: clamped, end: clamped + span } : candidate,
          ),
        }
      }),

    pushToast: (message, tone = 'info') => {
      const id = nextId('toast')
      set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
      // Errors linger a little longer than confirmations.
      const ttl = tone === 'danger' ? 4200 : 3000
      setTimeout(() => get().dismissToast(id), ttl)
    },

    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

    setLoading: (loading) => set({ loading }),

    undo: () =>
      set((state) => {
        const previous = state.past[state.past.length - 1]
        if (!previous) return {}
        return {
          ...previous,
          past: state.past.slice(0, -1),
          future: [snapshot(state), ...state.future],
        }
      }),

    redo: () =>
      set((state) => {
        const [next, ...rest] = state.future
        if (!next) return {}
        return { ...next, past: [...state.past, snapshot(state)], future: rest }
      }),

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  }
})

export const selectSelectedLayer = (state: EditorState): Layer | null =>
  state.layers.find((layer) => layer.id === state.selectedLayerId) ?? null

export const selectClipsForLayer = (state: EditorState, layerId: string): Clip[] =>
  state.clips.filter((clip) => clip.layerId === layerId)
