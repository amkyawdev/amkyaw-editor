import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TopBar } from './components/TopBar'
import { Viewport } from './components/Viewport'
import { PlaybackBar } from './components/PlaybackBar'
import { Timeline, type ContextMenuState } from './components/Timeline'
import { ToolBar } from './components/ToolBar'
import { LayerInspector } from './components/LayerInspector'
import { ContextMenu } from './components/ContextMenu'
import { Toasts } from './components/Toasts'
import { SheetHost } from './components/SheetHost'
import { EmptyState } from './components/EmptyState'
import { useEditorStore } from './useEditorStore'

/**
 * Phone-first shell (390×844 baseline): top bar, flexible viewport, playback
 * row, timeline, then the toolbar pinned inside the thumb zone. The viewport is
 * the only element that flexes, so the timeline and toolbar never move.
 */
const PhoneShell = () => {
  const playing = useEditorStore((state) => state.playing)
  const duration = useEditorStore((state) => state.duration)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const setPlaying = useEditorStore((state) => state.setPlaying)
  const layers = useEditorStore((state) => state.layers)
  const openSheet = useEditorStore((state) => state.openSheet)

  const [menu, setMenu] = useState<ContextMenuState>(null)

  // Transport: advance time on a frame-aligned interval while playing.
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const next = useEditorStore.getState().currentTime + 1 / 30
      if (next >= duration) {
        setCurrentTime(duration)
        setPlaying(false)
        return
      }
      setCurrentTime(next)
    }, 1000 / 30)
    return () => clearInterval(id)
  }, [playing, duration, setCurrentTime, setPlaying])

  const duplicateClip = useCallback((clipId: string) => {
    const store = useEditorStore.getState()
    store.duplicateClip(clipId)
    store.pushToast('Clip duplicated', 'success')
  }, [])

  const splitClip = useCallback((clipId: string) => {
    const store = useEditorStore.getState()
    const at = store.currentTime
    const clip = store.clips.find((candidate) => candidate.id === clipId)
    if (!clip || at <= clip.start || at >= clip.end) {
      store.pushToast('Move the playhead inside the clip to split it', 'warning')
      return
    }
    store.splitClip(clipId, at)
    store.pushToast('Clip split at playhead', 'success')
  }, [])

  const deleteClip = useCallback((clipId: string) => {
    const store = useEditorStore.getState()
    store.removeClip(clipId)
    store.pushToast('Clip deleted', 'danger')
  }, [])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-base">
      <TopBar />
      <Viewport />
      <PlaybackBar />

      {layers.length === 0 ? (
        <div className="px-3 py-3">
          <EmptyState onAdd={() => openSheet('add')} />
        </div>
      ) : (
        <Timeline onContextMenu={setMenu} />
      )}

      <div className="pointer-events-none relative z-20 -mt-2">
        <LayerInspector />
      </div>

      <ToolBar />
      <SheetHost />
      <Toasts />

      <ContextMenu
        state={menu}
        onClose={() => setMenu(null)}
        onDuplicate={() => menu && duplicateClip(menu.clipId)}
        onSplit={() => menu && splitClip(menu.clipId)}
        onDelete={() => menu && deleteClip(menu.clipId)}
      />

      <AnimatePresence>
        {playing ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-0"
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/**
 * Wide layout. Below `lg` the phone shell is used unchanged, because the editor
 * is designed around a narrow column; on desktop the panels sit side by side.
 */
const WideShell = () => (
  <div className="flex h-full min-h-0 bg-base">
    <div className="mx-auto flex h-full w-[420px] min-h-0 flex-col overflow-hidden border-x border-edge">
      <PhoneShell />
    </div>
    <aside className="hidden min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 lg:flex">
      <div className="surface-elevated p-4">
        <h2 className="text-title font-head text-ink">Amkyaw Editor</h2>
        <p className="mt-1 text-body text-muted">
          A mobile-first timeline editor. The phone frame on the left is the live application —
          every control is functional.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { k: 'Design', v: 'Dark cinematic, violet→pink gradient, cyan playhead' },
          { k: 'Gestures', v: 'Pinch zoom, drag scrub, long-press menu, swipe dismiss' },
          { k: 'Touch', v: '44px minimum targets, all actions in the thumb zone' },
          { k: 'Motion', v: '150ms press spring, 300ms sheet ease' },
        ].map((item) => (
          <div key={item.k} className="surface-card p-3">
            <p className="label-micro">{item.k}</p>
            <p className="mt-1 text-body text-muted">{item.v}</p>
          </div>
        ))}
      </div>
      <div className="surface-card flex-1 p-4">
        <p className="label-micro mb-2">Try</p>
        <ul className="flex flex-col gap-1.5 text-body text-muted">
          <li>• Tap any tool to open its sheet; tap again to close</li>
          <li>• Long-press a clip for duplicate / split / delete</li>
          <li>• Drag a clip horizontally to move it</li>
          <li>• Scrub the ruler to move the playhead</li>
          <li>• Pinch the preview to zoom, swipe down to reset</li>
        </ul>
      </div>
    </aside>
  </div>
)

export const EditorApp = () => {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)

  useEffect(() => {
    const update = () => setWide(window.innerWidth >= 1024)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Desktop shortcuts; harmless on touch devices.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const store = useEditorStore.getState()
      if (event.key === ' ') {
        event.preventDefault()
        store.togglePlayback()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        store.setPlaying(false)
        store.setCurrentTime(store.currentTime - (event.shiftKey ? 1 : 1 / 30))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        store.setPlaying(false)
        store.setCurrentTime(store.currentTime + (event.shiftKey ? 1 : 1 / 30))
      } else if (event.key === 'Escape') {
        store.closeSheet()
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) store.redo()
        else store.undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return wide ? <WideShell /> : <PhoneShell />
}
