import { motion } from 'framer-motion'
import { Layers, Settings2, Sparkles, Type, Move3d } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { TOOLS } from '../types'
import { haptics } from '@/mobile/haptics'

const ICONS = {
  add: Layers,
  effects: Sparkles,
  text: Type,
  transform: Move3d,
  settings: Settings2,
} as const

/**
 * 64px bottom toolbar, all primary actions inside the thumb zone. Tapping an
 * active tool closes its sheet, so the row doubles as a toggle bar.
 */
export const ToolBar = () => {
  const sheet = useEditorStore((state) => state.sheet)
  const openSheet = useEditorStore((state) => state.openSheet)
  const closeSheet = useEditorStore((state) => state.closeSheet)

  return (
    <nav
      className="toolbar-dock relative z-30 flex shrink-0 items-stretch border-t border-edge bg-surface1 px-1 pt-1"
      aria-label="Editor tools"
    >
      {TOOLS.map((tool) => {
        const Icon = ICONS[tool.id]
        const active = sheet === tool.sheet
        return (
          <motion.button
            key={tool.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            aria-pressed={active}
            onClick={() => {
              haptics.trigger('light')
              if (active) closeSheet()
              else openSheet(tool.sheet)
            }}
            className="flex min-h-touch flex-1 flex-col items-center justify-center gap-1 rounded-card py-1"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-[10px] transition-colors ${
                active ? 'bg-primary-soft' : ''
              }`}
              style={active ? { color: '#7C3AED', boxShadow: '0 0 20px rgba(124,58,237,0.4)' } : undefined}
            >
              <Icon size={22} className={active ? '' : 'text-muted'} />
            </span>
            <span className={`text-micro font-label ${active ? 'text-primary' : 'text-muted'}`}>
              {tool.label}
            </span>
          </motion.button>
        )
      })}
    </nav>
  )
}
