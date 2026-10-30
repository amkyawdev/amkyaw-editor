import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useUiStore } from '@/store/uiStore'
import { LayerPanel } from './LayerPanel'
import { InspectorPanel } from './InspectorPanel'
import { AssetPanel } from './AssetPanel'
import { ExportPanel } from './ExportPanel'

type Tab = 'layers' | 'properties' | 'assets' | 'export'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'layers', label: 'Layers' },
  { id: 'properties', label: 'Properties' },
  { id: 'assets', label: 'Media' },
  { id: 'export', label: 'Export' },
]

/** Desktop sidebar: one tab strip, one panel at a time, to keep it scannable. */
export const SidebarPanel = () => {
  const [tab, setTab] = useState<Tab>('layers')
  const projectName = useProjectStore((state) => state.project.name)
  const renameProject = useProjectStore((state) => state.renameProject)
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)

  if (!sidebarOpen) return null

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-edge bg-panel" aria-label="Editor sidebar">
      <div className="border-b border-edge px-3 py-2">
        <input
          className="field"
          value={projectName}
          onChange={(event) => renameProject(event.target.value)}
          aria-label="Project name"
        />
      </div>

      <div role="tablist" className="flex border-b border-edge">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            role="tab"
            type="button"
            aria-selected={tab === entry.id}
            className={`flex-1 px-2 py-2 text-xs ${
              tab === entry.id ? 'border-b-2 border-accent text-accent' : 'text-slate-400'
            }`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="scroll-surface flex-1 overflow-y-auto px-3 py-3">
        {tab === 'layers' ? <LayerPanel /> : null}
        {tab === 'properties' ? <InspectorPanel /> : null}
        {tab === 'assets' ? <AssetPanel /> : null}
        {tab === 'export' ? <ExportPanel /> : null}
      </div>
    </aside>
  )
}
