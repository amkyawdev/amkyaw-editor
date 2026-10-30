import { createId } from '@/lib/id'
import type { EffectInstance, EffectKind } from '@/types/effect'
import { effectDefinitions } from './definitions'

export type EffectPreset = {
  id: string
  name: string
  kind: EffectKind
  values: Record<string, number>
}

export const defaultEffectValues = (kind: EffectKind): Record<string, number> => ({
  ...effectDefinitions[kind].defaults,
})

export const createEffectInstance = (
  layerId: string,
  kind: EffectKind,
  values: Record<string, number> = {},
): EffectInstance => ({
  id: createId('effect'),
  layerId,
  kind,
  enabled: true,
  values: { ...defaultEffectValues(kind), ...values },
  trackIds: [],
})

export const effectPresets: EffectPreset[] = [
  { id: 'vivid', name: 'Vivid', kind: 'saturation', values: { amount: 1.45 } },
  { id: 'warm', name: 'Warm Grade', kind: 'colorGrade', values: { lift: 0.02, gamma: 0.95, gain: 1.08 } },
  { id: 'noir', name: 'Noir', kind: 'saturation', values: { amount: 0 } },
  { id: 'dreamy', name: 'Dreamy Glow', kind: 'glow', values: { amount: 0.9, threshold: 0.45 } },
  { id: 'soft-focus', name: 'Soft Focus', kind: 'blur', values: { radius: 3.5 } },
  { id: 'retro', name: 'Retro Grain', kind: 'grain', values: { amount: 0.18 } },
  { id: 'edge', name: 'Edge Pop', kind: 'sharpen', values: { amount: 0.9 } },
  { id: 'lens', name: 'Lens Fringe', kind: 'chromaticAberration', values: { amount: 0.012 } },
]

export const applyEffectPreset = (layerId: string, preset: EffectPreset): EffectInstance =>
  createEffectInstance(layerId, preset.kind, preset.values)
