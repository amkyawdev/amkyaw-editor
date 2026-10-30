import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration, LAYER_COLORS } from '@/editor/types'
import { EFFECT_LIBRARY, SAMPLE_CLIPS, SAMPLE_LAYERS } from '@/editor/mockData'

describe('editor formatting', () => {
  it('formats the transport clock with centiseconds', () => {
    expect(formatClock(0)).toBe('00:00.00')
    expect(formatClock(5.24)).toBe('00:05.24')
    expect(formatClock(65.5)).toBe('01:05.50')
    expect(formatClock(-3)).toBe('00:00.00')
  })

  it('formats duration as whole seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00')
    expect(formatDuration(5.99)).toBe('00:00:05')
    expect(formatDuration(3661)).toBe('01:01:01')
  })
})

describe('mock project integrity', () => {
  it('assigns a distinct colour per layer kind', () => {
    const values = Object.values(LAYER_COLORS)
    expect(new Set(values).size).toBe(values.length)
  })

  it('points every clip at a real layer', () => {
    const ids = new Set(SAMPLE_LAYERS.map((layer) => layer.id))
    for (const clip of SAMPLE_CLIPS) expect(ids.has(clip.layerId)).toBe(true)
  })

  it('keeps clips ordered and positive in length', () => {
    for (const clip of SAMPLE_CLIPS) expect(clip.end).toBeGreaterThan(clip.start)
  })

  it('ships at least eight effects for a full grid', () => {
    expect(EFFECT_LIBRARY.length).toBeGreaterThanOrEqual(8)
  })

  it('gives every effect a unique id and glyph', () => {
    expect(new Set(EFFECT_LIBRARY.map((e) => e.id)).size).toBe(EFFECT_LIBRARY.length)
    for (const effect of EFFECT_LIBRARY) expect(effect.glyph.length).toBeGreaterThan(0)
  })
})
