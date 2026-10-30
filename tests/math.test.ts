import { describe, expect, it } from 'vitest'
import {
  clamp,
  lerp,
  lerpVec2,
  midpoint,
  roundTo,
  vec2Distance,
  vec2Sub,
} from '@/lib/math'

describe('math helpers', () => {
  it('clamps to the inclusive range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('interpolates numbers and vectors', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5)
    expect(lerpVec2({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({ x: 5, y: 10 })
  })

  it('measures distance and midpoint', () => {
    expect(vec2Distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    expect(vec2Sub({ x: 5, y: 5 }, { x: 1, y: 2 })).toEqual({ x: 4, y: 3 })
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 10 })).toEqual({ x: 5, y: 5 })
  })

  it('rounds to a fixed number of decimals', () => {
    expect(roundTo(1.23456, 2)).toBe(1.23)
    expect(roundTo(1.005, 2)).toBe(1.01)
  })
})
