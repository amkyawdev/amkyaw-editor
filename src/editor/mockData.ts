import type { Clip, Effect, Layer } from './types'

export const PROJECT_NAME = 'Summer Reel 2026'
export const PROJECT_DURATION = 30
export const PROJECT_FPS = 30
export const CANVAS_RESOLUTION = { width: 1080, height: 1920 }

/** Three sample layers so the timeline is populated on first paint. */
export const SAMPLE_LAYERS: Layer[] = [
  {
    id: 'lyr_video',
    name: 'Beach Sunset.mp4',
    kind: 'video',
    visible: true,
    locked: false,
    start: 0,
    end: 12,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    opacity: 1,
  },
  {
    id: 'lyr_audio',
    name: 'Lo-fi Beat.mp3',
    kind: 'audio',
    visible: true,
    locked: false,
    start: 0,
    end: 30,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    opacity: 1,
  },
  {
    id: 'lyr_text',
    name: 'Title — Summer',
    kind: 'text',
    visible: true,
    locked: false,
    start: 2,
    end: 8,
    transform: { x: 0, y: -240, scale: 1, rotation: 0 },
    opacity: 1,
  },
]

export const SAMPLE_CLIPS: Clip[] = [
  { id: 'clp_video_1', layerId: 'lyr_video', start: 0, end: 7, label: 'Beach Sunset' },
  { id: 'clp_video_2', layerId: 'lyr_video', start: 7.4, end: 12, label: 'Waves' },
  { id: 'clp_audio_1', layerId: 'lyr_audio', start: 0, end: 18, label: 'Lo-fi Beat' },
  { id: 'clp_audio_2', layerId: 'lyr_audio', start: 18, end: 30, label: 'Outro' },
  { id: 'clp_text_1', layerId: 'lyr_text', start: 2, end: 8, label: 'Summer' },
]

export const EFFECT_LIBRARY: Effect[] = [
  { id: 'fx_glow', name: 'Glow', glyph: '✦', gradient: 'from-primary to-pink', category: 'stylize' },
  { id: 'fx_blur', name: 'Blur', glyph: '◍', gradient: 'from-secondary to-primary', category: 'blur' },
  { id: 'fx_fade', name: 'Fade', glyph: '◐', gradient: 'from-slate-600 to-slate-800', category: 'color' },
  { id: 'fx_slide', name: 'Slide', glyph: '⇥', gradient: 'from-pink to-warning', category: 'distort' },
  { id: 'fx_zoom', name: 'Zoom', glyph: '⤢', gradient: 'from-secondary to-success', category: 'distort' },
  { id: 'fx_vignette', name: 'Vignette', glyph: '◎', gradient: 'from-surface2 to-black', category: 'color' },
  { id: 'fx_shake', name: 'Shake', glyph: '≈', gradient: 'from-warning to-danger', category: 'distort' },
  { id: 'fx_chroma', name: 'Chroma', glyph: '◑', gradient: 'from-primary via-pink to-secondary', category: 'color' },
  { id: 'fx_grain', name: 'Grain', glyph: '▨', gradient: 'from-slate-700 to-slate-900', category: 'stylize' },
  { id: 'fx_bloom', name: 'Bloom', glyph: '❋', gradient: 'from-pink to-primary', category: 'stylize' },
]

export const SAMPLE_APPLIED_EFFECTS = [
  { id: 'ap_1', effectId: 'fx_glow', name: 'Glow', enabled: true, intensity: 62 },
  { id: 'ap_2', effectId: 'fx_blur', name: 'Blur', enabled: true, intensity: 24 },
]
