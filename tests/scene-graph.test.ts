import { describe, expect, it } from 'vitest'
import { flattenScene, resolveLayer, resolveScene } from '@/core/scene-graph'
import { identityTransform } from '@/lib/math'
import { defaultShapeStyle } from '@/types/layer'
import type { Layer } from '@/types/layer'
import type { Track } from '@/types/animation'

const makeLayer = (overrides: Partial<Layer> = {}): Layer => ({
  id: 'lyr_1',
  name: 'Layer',
  type: 'shape',
  parentId: null,
  visible: true,
  locked: false,
  solo: false,
  blendMode: 'normal',
  opacity: 1,
  startFrame: 0,
  endFrame: 100,
  transform: identityTransform(),
  mask: 'none',
  source: null,
  text: null,
  shape: defaultShapeStyle(),
  effectIds: [],
  trackIds: [],
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

describe('scene graph flattening', () => {
  it('emits each child immediately after its parent', () => {
    const parent = makeLayer({ id: 'parent' })
    const child = makeLayer({ id: 'child', parentId: 'parent' })
    const sibling = makeLayer({ id: 'sibling' })
    expect(flattenScene([parent, sibling, child]).map((layer) => layer.id)).toEqual([
      'parent',
      'child',
      'sibling',
    ])
  })

  it('keeps roots in array order even when a child is listed first', () => {
    const parent = makeLayer({ id: 'parent' })
    const child = makeLayer({ id: 'child', parentId: 'parent' })
    const sibling = makeLayer({ id: 'sibling' })
    // `sibling` is the first root encountered, so it paints before the parent
    // subtree; the child still follows its parent rather than leading the list.
    expect(flattenScene([child, sibling, parent]).map((layer) => layer.id)).toEqual([
      'sibling',
      'parent',
      'child',
    ])
  })

  it('treats layers with unknown parents as roots', () => {
    const orphan = makeLayer({ id: 'orphan', parentId: 'missing' })
    expect(flattenScene([orphan]).map((layer) => layer.id)).toEqual(['orphan'])
  })
})

describe('layer resolution', () => {
  it('marks layers outside their frame range as inactive', () => {
    const layer = makeLayer({ startFrame: 10, endFrame: 20 })
    const before = resolveLayer(layer, { frame: 5, tracks: [], effects: [] })
    const during = resolveLayer(layer, { frame: 15, tracks: [], effects: [] })
    expect(before.active).toBe(false)
    expect(during.active).toBe(true)
  })

  it('hides non-solo layers when a solo layer is set', () => {
    const a = makeLayer({ id: 'a' })
    const b = makeLayer({ id: 'b' })
    const resolved = resolveScene([a, b], { frame: 0, tracks: [], effects: [], soloLayerId: 'b' })
    expect(resolved.find((item) => item.layer.id === 'a')?.active).toBe(false)
    expect(resolved.find((item) => item.layer.id === 'b')?.active).toBe(true)
  })

  it('applies animated track values over static ones', () => {
    const layer = makeLayer({ transform: { ...identityTransform(), rotation: 0 } })
    const track: Track = {
      id: 'trk_1',
      layerId: 'lyr_1',
      property: 'rotation',
      enabled: true,
      muted: false,
      keyframes: [
        { id: 'k1', frame: 0, value: 0, easing: 'linear' },
        { id: 'k2', frame: 10, value: 90, easing: 'linear' },
      ],
    }
    const resolved = resolveLayer(layer, { frame: 5, tracks: [track], effects: [] })
    expect(resolved.transform.rotation).toBeCloseTo(45)
  })

  it('ignores disabled tracks', () => {
    const layer = makeLayer({ transform: { ...identityTransform(), rotation: 30 } })
    const track: Track = {
      id: 'trk_1',
      layerId: 'lyr_1',
      property: 'rotation',
      enabled: false,
      muted: false,
      keyframes: [
        { id: 'k1', frame: 0, value: 0, easing: 'linear' },
        { id: 'k2', frame: 10, value: 90, easing: 'linear' },
      ],
    }
    expect(resolveLayer(layer, { frame: 5, tracks: [track], effects: [] }).transform.rotation).toBe(30)
  })

  it('computes source time from trim and playback rate', () => {
    const layer = makeLayer({
      type: 'video',
      startFrame: 0,
      endFrame: 100,
      source: { assetId: null, url: null, trimIn: 2, trimOut: null, playbackRate: 2, loop: false },
    })
    const resolved = resolveLayer(layer, { frame: 50, tracks: [], effects: [] })
    // elapsed = 0.5, so sourceTime = 2 + 0.5 * 2 = 3
    expect(resolved.sourceTime).toBeCloseTo(3)
  })
})
