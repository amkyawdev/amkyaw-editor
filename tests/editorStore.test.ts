import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '@/editor/useEditorStore'
import { SAMPLE_CLIPS, SAMPLE_LAYERS } from '@/editor/mockData'

/** Resets to the seeded state between tests so ordering never leaks. */
const reset = () => {
  useEditorStore.setState({
    layers: SAMPLE_LAYERS,
    clips: SAMPLE_CLIPS,
    appliedEffects: [],
    selectedLayerId: 'lyr_video',
    selectedClipId: null,
    sheet: null,
    past: [],
    future: [],
    playing: false,
    currentTime: 5.24,
  })
}

describe('editor store', () => {
  beforeEach(reset)

  it('seeds three sample layers', () => {
    expect(useEditorStore.getState().layers).toHaveLength(3)
  })

  it('adds a layer with a matching clip and selects it', () => {
    const layer = useEditorStore.getState().addLayer('text')
    const state = useEditorStore.getState()
    expect(state.layers).toHaveLength(4)
    expect(state.clips.some((clip) => clip.layerId === layer.id)).toBe(true)
    expect(state.selectedLayerId).toBe(layer.id)
  })

  it('removes a layer together with its clips', () => {
    useEditorStore.getState().removeLayer('lyr_audio')
    const state = useEditorStore.getState()
    expect(state.layers.find((layer) => layer.id === 'lyr_audio')).toBeUndefined()
    expect(state.clips.filter((clip) => clip.layerId === 'lyr_audio')).toHaveLength(0)
  })

  it('clamps the playhead to the project bounds', () => {
    const store = useEditorStore.getState()
    store.setCurrentTime(-10)
    expect(useEditorStore.getState().currentTime).toBe(0)
    store.setCurrentTime(9999)
    expect(useEditorStore.getState().currentTime).toBe(30)
  })

  it('clamps zoom to a sane range', () => {
    const store = useEditorStore.getState()
    store.setZoom(99)
    expect(useEditorStore.getState().zoom).toBe(4)
    store.setZoom(0)
    expect(useEditorStore.getState().zoom).toBe(0.25)
  })

  it('splits a clip into two adjacent halves', () => {
    useEditorStore.getState().splitClip('clp_video_1', 3.5)
    const parts = useEditorStore
      .getState()
      .clips.filter((clip) => clip.layerId === 'lyr_video' && clip.start < 7)
    expect(parts).toHaveLength(2)
    expect(parts.some((clip) => clip.start === 3.5)).toBe(true)
    expect(parts.some((clip) => clip.end === 3.5)).toBe(true)
  })

  it('refuses to split outside the clip bounds', () => {
    const before = useEditorStore.getState().clips.length
    useEditorStore.getState().splitClip('clp_video_1', 20)
    expect(useEditorStore.getState().clips).toHaveLength(before)
  })

  it('moves a clip and keeps its duration', () => {
    const original = useEditorStore.getState().clips.find((clip) => clip.id === 'clp_text_1')!
    const span = original.end - original.start
    useEditorStore.getState().moveClip('clp_text_1', 10)
    const moved = useEditorStore.getState().clips.find((clip) => clip.id === 'clp_text_1')!
    expect(moved.start).toBe(10)
    expect(moved.end - moved.start).toBeCloseTo(span)
  })

  it('clamps a dragged clip so it cannot leave the timeline', () => {
    useEditorStore.getState().moveClip('clp_text_1', -50)
    expect(useEditorStore.getState().clips.find((clip) => clip.id === 'clp_text_1')!.start).toBe(0)
  })

  it('undoes and redoes a layer removal', () => {
    const store = useEditorStore.getState()
    store.removeLayer('lyr_text')
    expect(useEditorStore.getState().layers).toHaveLength(2)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().layers).toHaveLength(3)

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().layers).toHaveLength(2)
  })

  it('clears the redo stack once a new edit lands', () => {
    const store = useEditorStore.getState()
    store.removeLayer('lyr_text')
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().future).toHaveLength(1)
    useEditorStore.getState().addLayer('shape')
    expect(useEditorStore.getState().future).toHaveLength(0)
  })

  it('tracks applied effects through add, toggle and remove', () => {
    const store = useEditorStore.getState()
    store.addEffect('fx_glow', 'Glow')
    const added = useEditorStore.getState().appliedEffects
    expect(added).toHaveLength(1)
    expect(added[0].enabled).toBe(true)

    useEditorStore.getState().toggleEffect(added[0].id)
    expect(useEditorStore.getState().appliedEffects[0].enabled).toBe(false)

    useEditorStore.getState().removeEffect(added[0].id)
    expect(useEditorStore.getState().appliedEffects).toHaveLength(0)
  })

  it('updates only the targeted transform field', () => {
    const store = useEditorStore.getState()
    store.updateLayerTransform('lyr_text', { rotation: 45 })
    const layer = useEditorStore.getState().layers.find((l) => l.id === 'lyr_text')!
    expect(layer.transform.rotation).toBe(45)
    expect(layer.transform.scale).toBe(1)
  })

  it('opens and closes sheets', () => {
    useEditorStore.getState().openSheet('effects')
    expect(useEditorStore.getState().sheet).toBe('effects')
    useEditorStore.getState().closeSheet()
    expect(useEditorStore.getState().sheet).toBeNull()
  })
})
