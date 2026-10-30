export type EffectKind =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'blur'
  | 'sharpen'
  | 'vignette'
  | 'grain'
  | 'chromaticAberration'
  | 'pixelate'
  | 'glow'
  | 'colorGrade'

export type UniformValue = number | boolean | [number, number] | [number, number, number]

export type EffectParam = {
  name: string
  label: string
  min: number
  max: number
  step: number
  default: number
  /** Param name toggled when the effect is animatable. */
  animatable: boolean
}

export type EffectDefinition = {
  kind: EffectKind
  label: string
  /** GLSL body injected into the shared fragment shader. */
  fragment: string
  params: EffectParam[]
  defaults: Record<string, number>
}

export type EffectInstance = {
  id: string
  layerId: string
  kind: EffectKind
  enabled: boolean
  values: Record<string, number>
  trackIds: string[]
}
