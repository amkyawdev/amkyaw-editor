import { useEffect, useMemo } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'
import { useUiStore } from '@/store/uiStore'
import { usePlayback } from '@/hooks/usePlayback'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { readSafeAreaInsets, observeOrientation } from '@/mobile/orientation'
import { memoryManager } from '@/mobile/memory-manager'
import { loadProject, saveProject } from '@/lib/storage'
import { debounce } from '@/lib/throttle'

/**
 * Wires up app-wide concerns that have no natural owner in the component tree:
 * safe-area insets, orientation tracking, autosave, keyboard shortcuts and the
 * global memory budget. Called once from `App`.
 */
export const useEditorSession = () => {
  const project = useProjectStore((state) => state.project)
  const setProject = useProjectStore((state) => state.setProject)
  const setSafeArea = useUiStore((state) => state.setSafeArea)
  const togglePlayback = useEditorStore((state) => state.togglePlayback)
  const stepFrames = useEditorStore((state) => state.stepFrames)
  const setTool = useEditorStore((state) => state.setTool)
  const undo = useEditorStore((state) => state.setCurrentFrame)
  const { stepBy, toggle } = usePlayback()

  // Restore the most recent project on first mount.
  useEffect(() => {
    let active = true
    void (async () => {
      const restored = await loadProject(project.id)
      if (active && restored) setProject(restored)
    })()
    return () => {
      active = false
    }
    // Intentionally only on mount: `project.id` changes when a new project is
    // created, which should start fresh rather than reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced autosave; project mutations bump `updatedAt`.
  useEffect(() => {
    const save = debounce(() => {
      void saveProject(project).catch(() => undefined)
    }, 800)
    save()
    return () => save.cancel()
  }, [project])

  useEffect(() => {
    setSafeArea(readSafeAreaInsets())
    return observeOrientation(() => setSafeArea(readSafeAreaInsets()))
  }, [setSafeArea])

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number }
    const deviceMemoryGb = nav.deviceMemory ?? 4
    // Budget roughly a quarter of device memory for textures and decoded media.
    memoryManager.setBudget(Math.max(64, deviceMemoryGb * 1024 * 0.25) * 1024 * 1024)
  }, [])

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: ' ', description: 'Play/Pause', handler: () => toggle() },
        { key: 'ArrowLeft', description: 'Previous frame', handler: () => stepBy(-1) },
        { key: 'ArrowRight', description: 'Next frame', handler: () => stepBy(1) },
        { key: 'ArrowLeft', shift: true, description: 'Back 10 frames', handler: () => stepFrames(-10) },
        { key: 'ArrowRight', shift: true, description: 'Forward 10 frames', handler: () => stepFrames(10) },
        { key: 'z', mod: true, description: 'Undo', handler: () => undo(0) },
        { key: 'v', description: 'Select tool', handler: () => setTool('select') },
        { key: 'h', description: 'Hand tool', handler: () => setTool('hand') },
        { key: 't', description: 'Text tool', handler: () => setTool('text') },
        { key: 'k', description: 'Toggle playback', handler: () => togglePlayback() },
      ],
      [toggle, stepBy, stepFrames, undo, setTool, togglePlayback],
    ),
  )
}
