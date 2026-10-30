import type {
  AnimationPreset,
  AnimatableProperty,
  EasingName,
  KeyframeValue,
  PresetKeyframe,
} from '@/types/animation'

const kf = (
  frame: number,
  value: KeyframeValue,
  easing: EasingName = 'easeOutCubic',
): PresetKeyframe => ({
  frame,
  value,
  easing,
})

const build = (
  entries: Array<{ property: AnimatableProperty; keyframes: PresetKeyframe[] }>,
): AnimationPreset['build'] => {
  return (baseFrame: number) =>
    entries.map((entry) => ({
      property: entry.property,
      keyframes: entry.keyframes.map((keyframe) => ({
        ...keyframe,
        frame: baseFrame + keyframe.frame,
      })),
    }))
}

export const animationPresets: AnimationPreset[] = [
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'entrance',
    durationFrames: 15,
    build: build([
      { property: 'opacity', keyframes: [kf(0, 0, 'easeOutQuad'), kf(15, 1)] },
    ]),
  },
  {
    id: 'fade-out',
    name: 'Fade Out',
    category: 'exit',
    durationFrames: 15,
    build: build([
      { property: 'opacity', keyframes: [kf(0, 1, 'easeInQuad'), kf(15, 0)] },
    ]),
  },
  {
    id: 'slide-in-left',
    name: 'Slide In (Left)',
    category: 'entrance',
    durationFrames: 20,
    build: build([
      {
        property: 'position.x',
        keyframes: [kf(0, -640, 'easeOutCubic'), kf(20, 0)],
      },
      { property: 'opacity', keyframes: [kf(0, 0, 'easeOutQuad'), kf(20, 1)] },
    ]),
  },
  {
    id: 'slide-in-up',
    name: 'Slide In (Up)',
    category: 'entrance',
    durationFrames: 20,
    build: build([
      {
        property: 'position.y',
        keyframes: [kf(0, 360, 'easeOutCubic'), kf(20, 0)],
      },
      { property: 'opacity', keyframes: [kf(0, 0, 'easeOutQuad'), kf(20, 1)] },
    ]),
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    category: 'entrance',
    durationFrames: 18,
    build: build([
      { property: 'scale.x', keyframes: [kf(0, 0.4, 'easeOutBack'), kf(18, 1)] },
      { property: 'scale.y', keyframes: [kf(0, 0.4, 'easeOutBack'), kf(18, 1)] },
      { property: 'opacity', keyframes: [kf(0, 0, 'easeOutQuad'), kf(12, 1)] },
    ]),
  },
  {
    id: 'pop',
    name: 'Pop',
    category: 'emphasis',
    durationFrames: 12,
    build: build([
      { property: 'scale.x', keyframes: [kf(0, 1, 'easeOutBack'), kf(6, 1.15), kf(12, 1)] },
      { property: 'scale.y', keyframes: [kf(0, 1, 'easeOutBack'), kf(6, 1.15), kf(12, 1)] },
    ]),
  },
  {
    id: 'spin-in',
    name: 'Spin In',
    category: 'entrance',
    durationFrames: 24,
    build: build([
      { property: 'rotation', keyframes: [kf(0, -180, 'easeOutCubic'), kf(24, 0)] },
      { property: 'opacity', keyframes: [kf(0, 0, 'easeOutQuad'), kf(24, 1)] },
    ]),
  },
  {
    id: 'bounce-loop',
    name: 'Bounce (Loop)',
    category: 'loop',
    durationFrames: 30,
    build: build([
      {
        property: 'position.y',
        keyframes: [kf(0, 0, 'easeOutBounce'), kf(15, -40), kf(30, 0, 'easeOutBounce')],
      },
    ]),
  },
  {
    id: 'pulse-loop',
    name: 'Pulse (Loop)',
    category: 'loop',
    durationFrames: 40,
    build: build([
      { property: 'scale.x', keyframes: [kf(0, 1, 'easeInOutSine'), kf(20, 1.08), kf(40, 1)] },
      { property: 'scale.y', keyframes: [kf(0, 1, 'easeInOutSine'), kf(20, 1.08), kf(40, 1)] },
    ]),
  },
  {
    id: 'wobble',
    name: 'Wobble',
    category: 'emphasis',
    durationFrames: 24,
    build: build([
      { property: 'rotation', keyframes: [kf(0, 0, 'easeInOutSine'), kf(8, -6), kf(16, 6), kf(24, 0)] },
    ]),
  },
]

export const presetsByCategory = (category: AnimationPreset['category']): AnimationPreset[] =>
  animationPresets.filter((preset) => preset.category === category)
