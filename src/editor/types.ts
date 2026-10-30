/** Types for the mobile-first editor UI. */

export type LayerKind = 'video' | 'audio' | 'text' | 'shape'

/** Clip colour is derived from layer kind, per the design system. */
export const LAYER_COLORS: Record<LayerKind, string> = {
  video: '#7C3AED',
  audio: '#06B6D4',
  text: '#EC4899',
  shape: '#10B981',
}

export const LAYER_LABELS: Record<LayerKind, string> = {
  video: 'Video',
  audio: 'Audio',
  text: 'Text',
  shape: 'Shape',
}

export type Clip = {
  id: string
  layerId: string
  /** Seconds on the project timeline. */
  start: number
  end: number
  label: string
}

export type Layer = {
  id: string
  name: string
  kind: LayerKind
  visible: boolean
  locked: boolean
  /** Layer-local timeline span, in seconds. */
  start: number
  end: number
  transform: {
    x: number
    y: number
    scale: number
    rotation: number
  }
  opacity: number
}

export type Effect = {
  id: string
  name: string
  /** Short glyph shown in the effect grid thumbnail. */
  glyph: string
  /** Tailwind gradient classes for the thumbnail tile. */
  gradient: string
  category: 'color' | 'blur' | 'stylize' | 'distort'
}

export type AppliedEffect = {
  id: string
  effectId: string
  name: string
  enabled: boolean
  intensity: number
}

export type SheetId = 'add' | 'effects' | 'text' | 'transform' | 'settings' | 'export' | null

export type Toast = {
  id: string
  message: string
  tone: 'info' | 'success' | 'warning' | 'danger'
}

export type ToolId = 'add' | 'effects' | 'text' | 'transform' | 'settings'

export const TOOLS: Array<{ id: ToolId; label: string; sheet: SheetId }> = [
  { id: 'add', label: 'Layer', sheet: 'add' },
  { id: 'effects', label: 'Effects', sheet: 'effects' },
  { id: 'text', label: 'Text', sheet: 'text' },
  { id: 'transform', label: 'Transform', sheet: 'transform' },
  { id: 'settings', label: 'Settings', sheet: 'settings' },
]

/** `00:05.24` — seconds with centisecond precision. */
export const formatClock = (seconds: number): string => {
  const safe = Math.max(0, seconds)
  const mm = Math.floor(safe / 60)
  const ss = Math.floor(safe % 60)
  const cs = Math.floor((safe % 1) * 100)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(mm)}:${pad(ss)}.${pad(cs)}`
}

/** `00:00:05` — whole-second duration for the playback bar. */
export const formatDuration = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds))
  const hh = Math.floor(safe / 3600)
  const mm = Math.floor((safe % 3600) / 60)
  const ss = safe % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`
}
