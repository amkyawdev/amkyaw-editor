import { BottomSheet } from './BottomSheet'
import { LayerPanel } from '@/components/Sidebar/LayerPanel'
import { InspectorPanel } from '@/components/Sidebar/InspectorPanel'
import { AssetPanel } from '@/components/Sidebar/AssetPanel'
import { ExportPanel } from '@/components/Sidebar/ExportPanel'
import { useUiStore, type SheetId } from '@/store/uiStore'
import { animationPresets } from '@/animations/presets'
import { useAnimation } from '@/hooks/useAnimation'
import { useEditorStore } from '@/store/editorStore'
import { useProjectStore } from '@/store/projectStore'
import { haptics } from '@/mobile/haptics'
import { performanceMonitor } from '@/mobile/performance-monitor'
import { MemoryManager } from '@/mobile/memory-manager'

const SHEET_TITLES: Record<Exclude<SheetId, 'none'>, string> = {
  layers: 'Layers',
  effects: 'Effects & Presets',
  properties: 'Properties',
  assets: 'Media',
  export: 'Export',
  presets: 'Animation Presets',
  settings: 'Settings',
}

/**
 * Single host for every mobile sheet. Keeping one BottomSheet instance (rather
 * than one per panel) means the drag gesture and backdrop are only mounted once,
 * so opening a different panel does not re-trigger the entrance animation.
 */
export const MobileSheets = () => {
  const sheet = useUiStore((state) => state.sheet)
  const closeSheet = useUiStore((state) => state.closeSheet)
  const pushToast = useUiStore((state) => state.pushToast)

  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const layers = useProjectStore((state) => state.project.layers)
  const setPlaying = useEditorStore((state) => state.setPlaying)
  const { applyPreset } = useAnimation()

  const selected = layers.find((layer) => layer.id === selectedLayerId) ?? null

  if (sheet === 'none') return null

  const title = SHEET_TITLES[sheet]

  return (
    <BottomSheet
      open
      onClose={closeSheet}
      title={title}
      ariaLabel={title}
      minHeight={sheet === 'properties' || sheet === 'export' ? 0.45 : 0.35}
      detents={sheet === 'export' ? [0.35, 0.75, 0.92] : [0.35, 0.6, 0.92]}
    >
      {sheet === 'layers' ? <LayerPanel compact /> : null}
      {sheet === 'effects' ? <LayerPanel compact /> : null}
      {sheet === 'properties' ? <InspectorPanel compact /> : null}
      {sheet === 'assets' ? <AssetPanel /> : null}
      {sheet === 'export' ? <ExportPanel /> : null}

      {sheet === 'presets' ? (
        <div className="flex flex-col gap-3">
          {!selected ? (
            <p className="rounded-lg border border-dashed border-edge px-3 py-6 text-center text-xs text-slate-500">
              Select a layer to apply a preset.
            </p>
          ) : null}
          {animationPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={!selected}
              className="flex items-center justify-between rounded-lg border border-edge bg-panelAlt px-3 py-2.5 text-left disabled:opacity-50"
              onClick={() => {
                if (!selected) return
                haptics.trigger('success')
                setPlaying(false)
                applyPreset(selected.id, preset)
                pushToast(`Applied ${preset.name} to ${selected.name}`, 'success')
                closeSheet()
              }}
            >
              <span className="text-sm text-slate-100">{preset.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-slate-500">{preset.category}</span>
            </button>
          ))}
        </div>
      ) : null}

      {sheet === 'settings' ? (
        <div className="flex flex-col gap-3 text-sm text-slate-300">
          <p className="rounded-lg border border-edge bg-panelAlt px-3 py-3 leading-relaxed">
            Amkyaw Editor runs entirely on your device. Projects, media and thumbnails are stored in
            IndexedDB and never uploaded.
          </p>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const stats = performanceMonitor.getStats()
              const report = await MemoryManager.report()
              pushToast(
                `${Math.round(stats.averageFps)} fps avg · ${Math.round(report.usedRatio * 100)}% storage used`,
                'info',
              )
            }}
          >
            Show performance report
          </button>
        </div>
      ) : null}
    </BottomSheet>
  )
}
