import type { Layer } from './layer'
import type { Track } from './animation'
import type { EffectInstance } from './effect'
import type { TimelineTrack } from './track'
import type { Size } from '@/lib/math'

export type ProjectAspect = '16:9' | '9:16' | '1:1' | '4:5' | 'custom'

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'png-sequence' | 'webp'

export type ExportSettings = {
  format: ExportFormat
  width: number
  height: number
  fps: number
  bitrateKbps: number
  quality: 'low' | 'medium' | 'high' | 'ultra'
  includeAudio: boolean
  transparent: boolean
}

export type AssetKind = 'video' | 'audio' | 'image' | 'font'

export type Asset = {
  id: string
  name: string
  kind: AssetKind
  mimeType: string
  size: number
  durationSeconds: number | null
  width: number | null
  height: number | null
  /** Object URL for the in-memory blob; recreated on project load. */
  objectUrl: string | null
  /** Blob is persisted in IndexedDB, keyed by asset id. */
  persisted: boolean
  createdAt: number
}

export type Project = {
  id: string
  name: string
  schemaVersion: number
  fps: number
  durationFrames: number
  resolution: Size
  aspect: ProjectAspect
  backgroundColor: { r: number; g: number; b: number; a: number }
  layers: Layer[]
  tracks: TimelineTrack[]
  keyframeTracks: Track[]
  effects: EffectInstance[]
  assets: Asset[]
  exportSettings: ExportSettings
  createdAt: number
  updatedAt: number
}

export const CURRENT_SCHEMA_VERSION = 1

export const defaultExportSettings = (resolution: Size, fps: number): ExportSettings => ({
  format: 'mp4',
  width: resolution.width,
  height: resolution.height,
  fps,
  bitrateKbps: 12000,
  quality: 'high',
  includeAudio: true,
  transparent: false,
})

export const ASPECT_RATIOS: Record<Exclude<ProjectAspect, 'custom'>, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
}

export const QUALITY_BITRATE_MULTIPLIER: Record<ExportSettings['quality'], number> = {
  low: 0.35,
  medium: 0.6,
  high: 1,
  ultra: 1.6,
}
