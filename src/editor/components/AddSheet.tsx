import { motion } from 'framer-motion'
import { Film, Music, Shapes, Type } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { LAYER_COLORS, type LayerKind } from '../types'
import { haptics } from '@/mobile/haptics'

const ADD_KINDS: Array<{ kind: LayerKind; icon: typeof Film; hint: string }> = [
  { kind: 'video', icon: Film, hint: 'Import from library' },
  { kind: 'audio', icon: Music, hint: 'Music or voiceover' },
  { kind: 'text', icon: Type, hint: 'Title or caption' },
  { kind: 'shape', icon: Shapes, hint: 'Rect, ellipse, arrow' },
]

/** Grid of layer kinds; each tap creates a real layer and closes the sheet. */
export const AddSheet = () => {
  const closeSheet = useEditorStore((state) => state.closeSheet)
  const addLayer = useEditorStore((state) => state.addLayer)
  const pushToast = useEditorStore((state) => state.pushToast)

  return (
    <div className="grid grid-cols-2 gap-4">
      {ADD_KINDS.map((entry) => (
        <motion.button
          key={entry.kind}
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            haptics.trigger('medium')
            const layer = addLayer(entry.kind)
            pushToast(`Added ${layer.name}`, 'success')
            closeSheet()
          }}
          className="flex flex-col items-start gap-2 rounded-card border border-edge bg-surface2 p-3 text-left"
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-[14px] text-white"
            style={{ backgroundColor: LAYER_COLORS[entry.kind] }}
          >
            <entry.icon size={20} />
          </span>
          <span className="text-btn font-btn capitalize text-ink">{entry.kind}</span>
          <span className="text-micro text-muted">{entry.hint}</span>
        </motion.button>
      ))}
    </div>
  )
}
