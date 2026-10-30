import { create } from 'zustand'
import { createId } from '@/lib/id'
import {
  type Asset,
  type Project,
  CURRENT_SCHEMA_VERSION,
  defaultExportSettings,
} from '@/types/project'
import {
  type Layer,
  type LayerType,
  defaultShapeStyle,
  defaultTextStyle,
} from '@/types/layer'
import { identityTransform } from '@/lib/math'
import type { EffectInstance } from '@/types/effect'
import type { TimelineTrack } from '@/types/track'
import type { Track } from '@/types/animation'

const DEFAULT_FPS = 30
const DEFAULT_RESOLUTION = { width: 1920, height: 1080 }
const DEFAULT_DURATION_SECONDS = 10

export const createEmptyProject = (name = 'Untitled Project'): Project => {
  const now = Date.now()
  return {
    id: createId('project'),
    name,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    fps: DEFAULT_FPS,
    durationFrames: DEFAULT_FPS * DEFAULT_DURATION_SECONDS,
    resolution: { ...DEFAULT_RESOLUTION },
    aspect: '16:9',
    backgroundColor: { r: 0.04, g: 0.05, b: 0.07, a: 1 },
    layers: [],
    tracks: [],
    keyframeTracks: [],
    effects: [],
    assets: [],
    exportSettings: defaultExportSettings(DEFAULT_RESOLUTION, DEFAULT_FPS),
    createdAt: now,
    updatedAt: now,
  }
}

const trackKindFor = (type: LayerType): TimelineTrack['kind'] => {
  if (type === 'audio') return 'audio'
  if (type === 'text') return 'text'
  if (type === 'shape') return 'shape'
  if (type === 'adjustment') return 'effect'
  return 'video'
}

export type ProjectState = {
  project: Project
  setProject: (project: Project) => void
  renameProject: (name: string) => void
  setFps: (fps: number) => void
  setDuration: (frames: number) => void
  setResolution: (width: number, height: number) => void
  addLayer: (type: LayerType, overrides?: Partial<Layer>) => Layer
  updateLayer: (id: string, patch: Partial<Layer>) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => Layer | null
  reorderLayers: (fromIndex: number, toIndex: number) => void
  addAsset: (asset: Asset) => void
  removeAsset: (id: string) => void
  addEffect: (layerId: string, effect: EffectInstance) => void
  updateEffect: (id: string, patch: Partial<EffectInstance>) => void
  removeEffect: (id: string) => void
  addTrack: (track: Track) => void
  updateTrack: (id: string, patch: Partial<Track>) => void
  addTimelineTrack: (track: TimelineTrack) => void
  updateTimelineTrack: (id: string, patch: Partial<TimelineTrack>) => void
  removeTimelineTrack: (id: string) => void
}

const touch = (project: Project): Project => ({ ...project, updatedAt: Date.now() })

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createEmptyProject(),

  setProject: (project) => set({ project }),

  renameProject: (name) => set({ project: touch({ ...get().project, name }) }),

  setFps: (fps) =>
    set(({ project }) => ({
      project: touch({ ...project, fps, exportSettings: { ...project.exportSettings, fps } }),
    })),

  setDuration: (frames) =>
    set(({ project }) => ({
      project: touch({ ...project, durationFrames: Math.max(1, Math.round(frames)) }),
    })),

  setResolution: (width, height) =>
    set(({ project }) => ({
      project: touch({
        ...project,
        resolution: { width, height },
        exportSettings: { ...project.exportSettings, width, height },
      }),
    })),

  addLayer: (type, overrides = {}) => {
    const { project } = get()
    const layer: Layer = {
      id: createId('layer'),
      name: overrides.name ?? `${type[0].toUpperCase()}${type.slice(1)} ${project.layers.length + 1}`,
      type,
      parentId: null,
      visible: true,
      locked: false,
      solo: false,
      blendMode: 'normal',
      opacity: 1,
      startFrame: 0,
      endFrame: project.durationFrames,
      transform: identityTransform(),
      mask: 'none',
      source:
        type === 'video' || type === 'audio' || type === 'image'
          ? { assetId: null, url: null, trimIn: 0, trimOut: null, playbackRate: 1, loop: false }
          : null,
      text: type === 'text' ? defaultTextStyle() : null,
      shape: type === 'shape' ? defaultShapeStyle() : null,
      effectIds: [],
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    }
    const timelineTrack: TimelineTrack = {
      id: createId('track'),
      kind: trackKindFor(type),
      name: layer.name,
      layerIds: [layer.id],
      height: 48,
      locked: false,
      muted: false,
    }
    set({
      project: touch({
        ...project,
        layers: [...project.layers, layer],
        tracks: [...project.tracks, timelineTrack],
      }),
    })
    return layer
  },

  updateLayer: (id, patch) =>
    set(({ project }) => ({
      project: touch({
        ...project,
        layers: project.layers.map((layer) =>
          layer.id === id ? { ...layer, ...patch, updatedAt: Date.now() } : layer,
        ),
      }),
    })),

  removeLayer: (id) =>
    set(({ project }) => ({
      project: touch({
        ...project,
        layers: project.layers.filter((layer) => layer.id !== id),
        tracks: project.tracks
          .map((track) => ({ ...track, layerIds: track.layerIds.filter((lid) => lid !== id) }))
          .filter((track) => track.layerIds.length > 0),
        keyframeTracks: project.keyframeTracks.filter((track) => track.layerId !== id),
        effects: project.effects.filter((effect) => effect.layerId !== id),
      }),
    })),

  duplicateLayer: (id) => {
    const { project } = get()
    const source = project.layers.find((layer) => layer.id === id)
    if (!source) return null
    const copy: Layer = {
      ...source,
      id: createId('layer'),
      name: `${source.name} copy`,
      trackIds: [],
      effectIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const index = project.layers.findIndex((layer) => layer.id === id)
    const layers = [...project.layers]
    layers.splice(index + 1, 0, copy)
    set({ project: touch({ ...project, layers }) })
    return copy
  },

  reorderLayers: (fromIndex, toIndex) =>
    set(({ project }) => {
      const layers = [...project.layers]
      if (fromIndex < 0 || fromIndex >= layers.length) return { project }
      const [moved] = layers.splice(fromIndex, 1)
      layers.splice(Math.max(0, Math.min(layers.length, toIndex)), 0, moved)
      return { project: touch({ ...project, layers }) }
    }),

  addAsset: (asset) =>
    set(({ project }) => ({ project: touch({ ...project, assets: [...project.assets, asset] }) })),

  removeAsset: (id) =>
    set(({ project }) => ({
      project: touch({ ...project, assets: project.assets.filter((a) => a.id !== id) }),
    })),

  addEffect: (layerId, effect) =>
    set(({ project }) => ({
      project: touch({
        ...project,
        effects: [...project.effects, effect],
        layers: project.layers.map((layer) =>
          layer.id === layerId
            ? { ...layer, effectIds: [...layer.effectIds, effect.id], updatedAt: Date.now() }
            : layer,
        ),
      }),
    })),

  updateEffect: (id, patch) =>
    set(({ project }) => ({
      project: touch({
        ...project,
        effects: project.effects.map((effect) =>
          effect.id === id ? { ...effect, ...patch } : effect,
        ),
      }),
    })),

  removeEffect: (id) =>
    set(({ project }) => ({
      project: touch({
        ...project,
        effects: project.effects.filter((effect) => effect.id !== id),
        layers: project.layers.map((layer) => ({
          ...layer,
          effectIds: layer.effectIds.filter((eid) => eid !== id),
        })),
      }),
    })),

  addTrack: (track) =>
    set(({ project }) => ({
      project: touch({ ...project, keyframeTracks: [...project.keyframeTracks, track] }),
    })),

  updateTrack: (id, patch) =>
    set(({ project }) => ({
      project: touch({
        ...project,
        keyframeTracks: project.keyframeTracks.map((track) =>
          track.id === id ? { ...track, ...patch } : track,
        ),
      }),
    })),

  addTimelineTrack: (track) =>
    set(({ project }) => ({ project: touch({ ...project, tracks: [...project.tracks, track] }) })),

  updateTimelineTrack: (id, patch) =>
    set(({ project }) => ({
      project: touch({
        ...project,
        tracks: project.tracks.map((track) => (track.id === id ? { ...track, ...patch } : track)),
      }),
    })),

  removeTimelineTrack: (id) =>
    set(({ project }) => ({
      project: touch({ ...project, tracks: project.tracks.filter((track) => track.id !== id) }),
    })),
}))

export const selectLayer = (id: string | null) => (state: ProjectState): Layer | null =>
  id ? state.project.layers.find((layer) => layer.id === id) ?? null : null

export const selectLayerEffects = (layerId: string) => (state: ProjectState): EffectInstance[] =>
  state.project.effects.filter((effect) => effect.layerId === layerId)

export const selectAsset = (id: string | null) => (state: ProjectState): Asset | null =>
  id ? state.project.assets.find((asset) => asset.id === id) ?? null : null
