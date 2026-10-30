import type { RGBA, Vec2 } from '@/lib/math'

export type AnimatableProperty =
  | 'position.x'
  | 'position.y'
  | 'scale.x'
  | 'scale.y'
  | 'rotation'
  | 'opacity'
  | 'blur'
  | 'color.r'
  | 'color.g'
  | 'color.b'
  | 'color.a'

export type KeyframeValue = number | Vec2 | RGBA

export type EasingName =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInOutSine'
  | 'easeOutBack'
  | 'easeOutElastic'
  | 'easeOutBounce'
  | 'step'

export type Keyframe<T extends KeyframeValue = number> = {
  id: string
  /** Absolute timeline frame. */
  frame: number
  value: T
  easing: EasingName
  selected?: boolean
}

export type Track<T extends KeyframeValue = number> = {
  id: string
  layerId: string
  property: AnimatableProperty
  keyframes: Keyframe<T>[]
  enabled: boolean
  muted: boolean
}

export type PresetKeyframe = Omit<Keyframe<KeyframeValue>, 'id'>

export type AnimationPreset = {
  id: string
  name: string
  category: 'entrance' | 'exit' | 'emphasis' | 'loop'
  durationFrames: number
  build: (baseFrame: number) => Array<{
    property: AnimatableProperty
    keyframes: PresetKeyframe[]
  }>
}

export const isKeyframeSorted = <T extends KeyframeValue>(frames: Keyframe<T>[]): boolean =>
  frames.every((kf, i) => i === 0 || frames[i - 1].frame <= kf.frame)
