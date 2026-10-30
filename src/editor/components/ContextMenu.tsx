import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Scissors, Trash2 } from 'lucide-react'
import type { ContextMenuState } from './Timeline'

const MENU_WIDTH = 196
const ITEM_HEIGHT = 44

export type ContextMenuProps = {
  state: ContextMenuState
  onClose: () => void
  onDuplicate: () => void
  onSplit: () => void
  onDelete: () => void
}

/** Long-press context menu, clamped so it never opens off-screen. */
export const ContextMenu = ({ state, onClose, onDuplicate, onSplit, onDelete }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [state, onClose])

  if (!state) return null

  const height = ITEM_HEIGHT * 3 + 16
  const left = Math.min(Math.max(8, state.x - MENU_WIDTH / 2), window.innerWidth - MENU_WIDTH - 8)
  const top = Math.max(8, Math.min(state.y - height - 8, window.innerHeight - height - 8))

  const items = [
    { id: 'duplicate', label: 'Duplicate', icon: Copy, action: onDuplicate, danger: false },
    { id: 'split', label: 'Split at playhead', icon: Scissors, action: onSplit, danger: false },
    { id: 'delete', label: 'Delete', icon: Trash2, action: onDelete, danger: true },
  ]

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        role="menu"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.16 }}
        className="glass fixed z-50 overflow-hidden rounded-card border border-edge shadow-float"
        style={{ left, top, width: MENU_WIDTH }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={() => {
              item.action()
              onClose()
            }}
            className={`flex w-full items-center gap-3 px-3 text-body font-label pressable ${
              item.danger ? 'text-danger' : 'text-ink'
            }`}
            style={{ height: ITEM_HEIGHT }}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
