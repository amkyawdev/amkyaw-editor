import type { AnimationPreset } from '@/types/animation'
import type { AnimatableProperty } from '@/types/animation'
import { animationPresets } from './presets'

export type PropertyDescriptor = {
  property: AnimatableProperty
  label: string
  unit: 'number' | 'percent' | 'degrees' | 'color'
  default: number
  min: number
  max: number
}

export const animatableProperties: PropertyDescriptor[] = [
  { property: 'position.x', label: 'Position X', unit: 'number', default: 0, min: -4096, max: 4096 },
  { property: 'position.y', label: 'Position Y', unit: 'number', default: 0, min: -4096, max: 4096 },
  { property: 'scale.x', label: 'Scale X', unit: 'percent', default: 1, min: 0, max: 10 },
  { property: 'scale.y', label: 'Scale Y', unit: 'percent', default: 1, min: 0, max: 10 },
  { property: 'rotation', label: 'Rotation', unit: 'degrees', default: 0, min: -3600, max: 3600 },
  { property: 'opacity', label: 'Opacity', unit: 'percent', default: 1, min: 0, max: 1 },
  { property: 'blur', label: 'Blur', unit: 'number', default: 0, min: 0, max: 64 },
]

const registry = new Map<string, AnimationPreset>()
for (const preset of animationPresets) registry.set(preset.id, preset)

export const registerPreset = (preset: AnimationPreset): void => {
  registry.set(preset.id, preset)
}

export const getPreset = (id: string): AnimationPreset | undefined => registry.get(id)

export const listPresets = (): AnimationPreset[] => [...registry.values()]

export const getPropertyDescriptor = (
  property: AnimatableProperty,
): PropertyDescriptor | undefined =>
  animatableProperties.find((descriptor) => descriptor.property === property)
