import { useEffect, useRef } from 'react'
import { haptics } from '@/mobile/haptics'

export type FloatingMenuItem = {
  id: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type FloatingMenuProps = {
  open: boolean
  x: number
  y: number
  items: FloatingMenuItem[]
  onClose: () => void
}

const MENU_WIDTH = 200
const MENU_HEIGHT_PER_ITEM = 40

/**
 * Context menu anchored at the long-press point. The position is clamped to the
 * viewport so the menu never opens partly off-screen — a common problem on
 * phones where the press point is near an edge.
 */
export const FloatingMenu = ({ open, x, y, items, onClose }: FloatingMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const maxX = Math.max(8, window.innerWidth - MENU_WIDTH - 8)
  const estimatedHeight = items.length * MENU_HEIGHT_PER_ITEM + 8
  const maxY = Math.max(8, window.innerHeight - estimatedHeight - 8)

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[55] w-[200px] overflow-hidden rounded-xl border border-edge bg-panel/98 py-1 shadow-2xl backdrop-blur animate-fade-in"
      style={{ left: Math.min(x, maxX), top: Math.min(y, maxY) }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
            item.disabled
              ? 'cursor-not-allowed text-slate-600'
              : item.danger
                ? 'text-danger hover:bg-danger/10'
                : 'text-slate-200 hover:bg-edge/60'
          }`}
          onClick={() => {
            if (item.disabled) return
            haptics.trigger('light')
            item.onSelect()
            onClose()
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
