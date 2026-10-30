import { describe, expect, it } from 'vitest'
import {
  evaluateKeyframes,
  findKeyframeIndex,
  removeKeyframeAt,
  sortKeyframes,
  upsertKeyframe,
} from '@/animations/keyframes'
import { applyEasing, cubicBezier } from '@/animations/easing'
import type { Keyframe } from '@/types/animation'

const kf = (frame: number, value: number, easing: Keyframe<number>['easing'] = 'linear'): Keyframe<number> => ({
  id: `kf_${frame}`,
  frame,
  value,
  easing,
})

describe('keyframe evaluation', () => {
  const keyframes = [kf(0, 0), kf(10, 100), kf(20, 50)]

  it('finds the segment index for a frame', () => {
    expect(findKeyframeIndex(keyframes, -1)).toBe(-1)
    expect(findKeyframeIndex(keyframes, 0)).toBe(0)
    expect(findKeyframeIndex(keyframes, 9)).toBe(0)
    expect(findKeyframeIndex(keyframes, 10)).toBe(1)
    expect(findKeyframeIndex(keyframes, 999)).toBe(2)
  })

  it('clamps before the first and after the last keyframe', () => {
    expect(evaluateKeyframes(keyframes, -10)).toBe(0)
    expect(evaluateKeyframes(keyframes, 999)).toBe(50)
  })

  it('interpolates linearly inside a segment', () => {
    expect(evaluateKeyframes(keyframes, 5)).toBeCloseTo(50)
    expect(evaluateKeyframes(keyframes, 15)).toBeCloseTo(75)
  })

  it('returns null for an empty track', () => {
    expect(evaluateKeyframes([], 5)).toBeNull()
  })

  it('honours the outgoing keyframe easing', () => {
    const eased = [kf(0, 0, 'easeInQuad'), kf(10, 100)]
    // easeInQuad(0.5) = 0.25
    expect(evaluateKeyframes(eased, 5)).toBeCloseTo(25)
  })
})

describe('keyframe collection helpers', () => {
  it('sorts without mutating the input', () => {
    const input = [kf(20, 1), kf(0, 2)]
    const sorted = sortKeyframes(input)
    expect(sorted.map((k) => k.frame)).toEqual([0, 20])
    expect(input.map((k) => k.frame)).toEqual([20, 0])
  })

  it('replaces a keyframe on the same frame when upserting', () => {
    const result = upsertKeyframe([kf(0, 1), kf(10, 2)], kf(10, 99))
    expect(result).toHaveLength(2)
    expect(result.find((k) => k.frame === 10)?.value).toBe(99)
  })

  it('removes the keyframe at an exact frame', () => {
    expect(removeKeyframeAt([kf(0, 1), kf(10, 2)], 10).map((k) => k.frame)).toEqual([0])
  })
})

describe('easing', () => {
  it('anchors every easing at 0 and 1', () => {
    expect(applyEasing('easeInOutCubic', 0)).toBe(0)
    expect(applyEasing('easeOutElastic', 0)).toBe(0)
    expect(applyEasing('easeOutBounce', 1)).toBeCloseTo(1)
  })

  it('clamps out-of-range progress', () => {
    expect(applyEasing('linear', -1)).toBe(0)
    expect(applyEasing('linear', 2)).toBe(1)
  })

  it('keeps step easing flat', () => {
    expect(applyEasing('step', 0.99)).toBe(0)
  })

  it('evaluates a cubic bezier between 0 and 1', () => {
    const fn = cubicBezier(0.42, 0, 0.58, 1)
    expect(fn(0)).toBe(0)
    expect(fn(1)).toBe(1)
    expect(fn(0.5)).toBeGreaterThan(0.4)
    expect(fn(0.5)).toBeLessThan(0.6)
  })
})
