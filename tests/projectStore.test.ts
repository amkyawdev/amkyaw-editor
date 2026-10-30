import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject, useProjectStore } from '@/store/projectStore'

const reset = () => {
  useProjectStore.setState({ project: createEmptyProject('Test') })
}

describe('project store', () => {
  beforeEach(reset)

  it('starts from a valid empty project', () => {
    const { project } = useProjectStore.getState()
    expect(project.layers).toEqual([])
    expect(project.fps).toBe(30)
    expect(project.durationFrames).toBe(300)
  })

  it('adds a layer together with a timeline track', () => {
    const layer = useProjectStore.getState().addLayer('text')
    const { project } = useProjectStore.getState()
    expect(project.layers).toHaveLength(1)
    expect(project.tracks).toHaveLength(1)
    expect(project.tracks[0].layerIds).toEqual([layer.id])
    expect(project.tracks[0].kind).toBe('text')
    expect(layer.text?.content).toBe('Text')
  })

  it('updates and removes layers, cleaning up dependants', () => {
    const store = useProjectStore.getState()
    const layer = store.addLayer('video')
    store.updateLayer(layer.id, { name: 'Renamed' })
    expect(useProjectStore.getState().project.layers[0].name).toBe('Renamed')

    store.removeLayer(layer.id)
    const { project } = useProjectStore.getState()
    expect(project.layers).toHaveLength(0)
    expect(project.tracks).toHaveLength(0)
  })

  it('duplicates a layer with a fresh id', () => {
    const store = useProjectStore.getState()
    const layer = store.addLayer('shape')
    const copy = store.duplicateLayer(layer.id)
    expect(copy).not.toBeNull()
    expect(copy!.id).not.toBe(layer.id)
    expect(useProjectStore.getState().project.layers).toHaveLength(2)
  })

  it('reorders layers by index', () => {
    const store = useProjectStore.getState()
    const a = store.addLayer('shape', { name: 'A' })
    store.addLayer('shape', { name: 'B' })
    store.reorderLayers(0, 1)
    expect(useProjectStore.getState().project.layers.map((l) => l.id)).toEqual([
      expect.any(String),
      a.id,
    ])
  })

  it('keeps export settings in sync with fps and resolution', () => {
    const store = useProjectStore.getState()
    store.setFps(60)
    store.setResolution(1080, 1920)
    const { exportSettings } = useProjectStore.getState().project
    expect(exportSettings.fps).toBe(60)
    expect(exportSettings.width).toBe(1080)
    expect(exportSettings.height).toBe(1920)
  })

  it('clamps duration to at least one frame', () => {
    useProjectStore.getState().setDuration(-10)
    expect(useProjectStore.getState().project.durationFrames).toBe(1)
  })
})
