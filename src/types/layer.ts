import type { RGBA, Transform, Vec2 } from '@/lib/math'

export type LayerType =
  | 'video'
  | 'image'
  | 'audio'
  | 'text'
  | 'shape'
  | 'adjustment'
  | 'group'

export type BlendMode =
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'

export type MaskMode = 'none' | 'rect' | 'ellipse' | 'luma' | 'alpha'

export type TextStyle = {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  align: 'left' | 'center' | 'right'
  color: RGBA
}

export type ShapeStyle = {
  kind: 'rect' | 'ellipse' | 'polygon' | 'path'
  fill: RGBA
  stroke: RGBA
  strokeWidth: number
  cornerRadius: number
  points?: Vec2[]
}

export type LayerSource = {
  assetId: string | null
  url: string | null
  /** Trim offset into the source media, in seconds. */
  trimIn: number
  trimOut: number | null
  playbackRate: number
  loop: boolean
}

export type Layer = {
  id: string
  name: string
  type: LayerType
  parentId: string | null
  visible: boolean
  locked: boolean
  solo: boolean
  blendMode: BlendMode
  opacity: number
  /** Layer-local frame range; `endFrame` is inclusive. */
  startFrame: number
  endFrame: number
  transform: Transform
  mask: MaskMode
  source: LayerSource | null
  text: TextStyle | null
  shape: ShapeStyle | null
  effectIds: string[]
  trackIds: string[]
  createdAt: number
  updatedAt: number
}

export const defaultTextStyle = (): TextStyle => ({
  content: 'Text',
  fontFamily: 'Inter',
  fontSize: 72,
  fontWeight: 600,
  letterSpacing: 0,
  lineHeight: 1.2,
  align: 'center',
  color: { r: 1, g: 1, b: 1, a: 1 },
})

export const defaultShapeStyle = (): ShapeStyle => ({
  kind: 'rect',
  fill: { r: 0.36, g: 0.55, b: 1, a: 1 },
  stroke: { r: 0, g: 0, b: 0, a: 0 },
  strokeWidth: 0,
  cornerRadius: 0,
})

export const isTimeLayer = (layer: Layer): boolean =>
  layer.type === 'video' || layer.type === 'audio'

export const layerDuration = (layer: Layer): number => layer.endFrame - layer.startFrame + 1
