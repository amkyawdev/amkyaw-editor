import { useMemo } from 'react'
import { useResponsive } from '@/hooks/useResponsive'
import { useEditorSession } from '@/hooks/useEditorSession'
import { usePlayback } from '@/hooks/usePlayback'
import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'
import { useUiStore } from '@/store/uiStore'
import { SidebarPanel } from '@/components/Sidebar/SidebarPanel'
import { ViewportPanel } from '@/components/Viewport/ViewportPanel'
import { MobileViewport } from '@/components/Viewport/MobileViewport'
import { TimelinePanel } from '@/components/Timeline/TimelinePanel'
import { TouchTimeline } from '@/components/mobile/TouchTimeline'
import { MobileToolbar } from '@/components/mobile/MobileToolbar'
import { MobileSheets } from '@/components/mobile/MobileSheets'
import { Toasts } from '@/components/common/Toasts'
import { FloatingMenu } from '@/components/mobile/FloatingMenu'
import { framesToTimecode } from '@/lib/time'
import { haptics } from '@/mobile/haptics'
import type { LayerType } from '@/types/layer'

/** Desktop layout: sidebar + preview + timeline. */
const DesktopLayout = () => {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const projectName = useProjectStore((state) => state.project.name)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-edge bg-panel px-3 py-2">
        <button
          type="button"
          className="btn touch-target"
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          onClick={toggleSidebar}
        >
          ☰
        </button>
        <span className="font-semibold tracking-tight">Amkyaw Editor</span>
        <span className="chip truncate">{projectName}</span>
        <span className="ml-auto chip">Desktop</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <SidebarPanel />
        <main className="flex min-h-0 flex-1 flex-col">
          <ViewportPanel className="min-h-0 flex-1" />
          <div className="h-[38%] min-h-[200px]">
            <TimelinePanel />
          </div>
        </main>
      </div>
    </div>
  )
}

/** Mobile layout: full-bleed preview, thumb-reach toolbar, drag-up sheets. */
const MobileLayout = () => {
  const addLayer = useProjectStore((state) => state.addLayer)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const currentFrame = useEditorStore((state) => state.currentFrame)
  const playing = useEditorStore((state) => state.playing)
  const fps = useProjectStore((state) => state.project.fps)
  const openFloatingMenu = useUiStore((state) => state.openFloatingMenu)
  const floatingMenu = useUiStore((state) => state.floatingMenu)
  const closeFloatingMenu = useUiStore((state) => state.closeFloatingMenu)
  const openSheet = useUiStore((state) => state.openSheet)
  const pushToast = useUiStore((state) => state.pushToast)
  const { toggle } = usePlayback()

  const menuItems = useMemo(
    () =>
      (['text', 'shape', 'image', 'video', 'audio', 'adjustment'] as LayerType[]).map((type) => ({
        id: type,
        label: `Add ${type} layer`,
        onSelect: () => {
          const layer = addLayer(type)
          selectLayer(layer.id)
          openSheet('properties')
          pushToast(`Added ${layer.name}`, 'success')
        },
      })),
    [addLayer, selectLayer, openSheet, pushToast],
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b0d12]">
      <header className="safe-top flex items-center gap-2 px-3 py-2">
        <span className="text-sm font-semibold tracking-tight">Amkyaw</span>
        <span className="chip ml-auto">{framesToTimecode(currentFrame, fps)}</span>
        <button
          type="button"
          className="touch-target rounded-lg text-slate-400"
          aria-label="Settings"
          onClick={() => openSheet('settings')}
        >
          ⚙
        </button>
      </header>

      <MobileViewport />

      <div className="px-2 pb-1">
        <TouchTimeline height={168} />
      </div>

      <div className="pb-[calc(var(--toolbar-height)+var(--safe-bottom))]" />

      <MobileToolbar
        playing={playing}
        currentTimecode={framesToTimecode(currentFrame, fps)}
        onPlayToggle={toggle}
        onAdd={() => {
          haptics.trigger('light')
          openFloatingMenu(window.innerWidth / 2 - 100, window.innerHeight / 2 - 120)
        }}
      />

      <FloatingMenu
        open={floatingMenu.open}
        x={floatingMenu.x}
        y={floatingMenu.y}
        items={menuItems}
        onClose={closeFloatingMenu}
      />
    </div>
  )
}

export const App = () => {
  useEditorSession()
  const { isTouch, width } = useResponsive()

  // Coarse pointer OR a narrow viewport means the mobile shell; a small window
  // on a desktop still gets the full editor.
  const mobile = isTouch || width < 768

  return (
    <div className="safe-frame h-full">
      {mobile ? <MobileLayout /> : <DesktopLayout />}
      <MobileSheets />
      <Toasts />
    </div>
  )
}
