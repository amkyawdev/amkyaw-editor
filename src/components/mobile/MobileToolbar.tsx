import { useUiStore, type SheetId } from '@/store/uiStore'
import { haptics } from '@/mobile/haptics'

export type MobileToolbarAction = {
  id: SheetId | 'play' | 'add'
  label: string
  icon: React.ReactNode
  onPress?: () => void
  primary?: boolean
}

export type MobileToolbarProps = {
  onPlayToggle: () => void
  onAdd: () => void
  playing: boolean
  currentTimecode: string
}

const Icon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d={path} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ICONS = {
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm0 11l9 5-9 5-9-5 9-5z',
  effects: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  properties: 'M4 6h16M4 12h10M4 18h6',
  assets: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6',
  export: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
  add: 'M12 5v14M5 12h14',
}

/** Bottom toolbar positioned within thumb reach, above the home indicator. */
export const MobileToolbar = ({ onPlayToggle, onAdd, playing, currentTimecode }: MobileToolbarProps) => {
  const toggleSheet = useUiStore((state) => state.toggleSheet)
  const sheet = useUiStore((state) => state.sheet)

  const items: MobileToolbarAction[] = [
    { id: 'layers', label: 'Layers', icon: <Icon path={ICONS.layers} /> },
    { id: 'effects', label: 'Effects', icon: <Icon path={ICONS.effects} /> },
    { id: 'play', label: playing ? 'Pause' : 'Play', icon: <Icon path={playing ? ICONS.pause : ICONS.play} />, primary: true },
    { id: 'add', label: 'Add', icon: <Icon path={ICONS.add} /> },
    { id: 'export', label: 'Export', icon: <Icon path={ICONS.export} /> },
  ]

  return (
    <div className="bottom-dock safe-bottom fixed inset-x-0 z-40 border-t border-edge bg-panel/95 backdrop-blur">
      <div className="flex items-center justify-between px-2 pb-1 pt-1">
        <span className="px-2 font-mono text-[11px] tabular-nums text-slate-400">{currentTimecode}</span>
      </div>
      <nav className="flex items-stretch justify-around" aria-label="Editor tools">
        {items.map((item) => {
          const active = sheet === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={item.id === 'play' ? playing : active}
              onClick={() => {
                haptics.trigger('light')
                if (item.id === 'play') onPlayToggle()
                else if (item.id === 'add') onAdd()
                else toggleSheet(item.id as SheetId)
              }}
              className={`touch-target flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] ${
                item.primary ? 'text-accent' : active ? 'bg-accentSoft/40 text-accent' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
