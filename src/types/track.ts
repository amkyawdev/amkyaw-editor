export type { Track, Keyframe, KeyframeValue, AnimatableProperty, EasingName } from './animation'

export type Clip = {
  id: string
  layerId: string
  startFrame: number
  endFrame: number
  /** Trim offset within the source asset, in seconds. */
  sourceIn: number
  sourceOut: number | null
  speed: number
}

export type TrackKind = 'video' | 'audio' | 'effect' | 'text' | 'shape'

export type TimelineTrack = {
  id: string
  kind: TrackKind
  name: string
  layerIds: string[]
  height: number
  locked: boolean
  muted: boolean
}

export const trackKindForLayer = (type: string): TrackKind => {
  switch (type) {
    case 'audio':
      return 'audio'
    case 'text':
      return 'text'
    case 'shape':
      return 'shape'
    case 'adjustment':
      return 'effect'
    default:
      return 'video'
  }
}
