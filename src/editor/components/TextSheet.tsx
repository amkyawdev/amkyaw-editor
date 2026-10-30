import { motion } from 'framer-motion'
import { Type } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { haptics } from '@/mobile/haptics'

const TEXT_PRESETS = [
  { id: 't1', label: 'Bold Title', size: 44, weight: 700, sample: 'SUMMER' },
  { id: 't2', label: 'Subtitle', size: 28, weight: 500, sample: 'by the shore' },
  { id: 't3', label: 'Caption', size: 20, weight: 400, sample: 'golden hour' },
  { id: 't4', label: 'Sticker', size: 32, weight: 700, sample: '✨ vibes' },
]

/** Text presets. Each tile creates a text layer named after the preset. */
export const TextSheet = () => {
  const closeSheet = useEditorStore((state) => state.closeSheet)
  const addLayer = useEditorStore((state) => state.addLayer)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const pushToast = useEditorStore((state) => state.pushToast)

  const create = (name: string) => {
    haptics.trigger('medium')
    const layer = addLayer('text')
    updateLayer(layer.id, { name })
    pushToast(`${name} added`, 'success')
    closeSheet()
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => create('New Text')}
        className="flex h-12 items-center justify-center gap-2 rounded-btn border border-primary/60 bg-primary-soft text-btn font-btn text-primary pressable"
      >
        <Type size={16} />
        Add text layer
      </button>

      <p className="label-micro">Presets</p>
      <div className="grid grid-cols-2 gap-4">
        {TEXT_PRESETS.map((preset) => (
          <motion.button
            key={preset.id}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => create(preset.label)}
            className="flex h-20 flex-col items-center justify-center gap-1 rounded-card border border-edge bg-surface2"
          >
            <span
              className="text-ink"
              style={{ fontSize: Math.min(20, preset.size / 2), fontWeight: preset.weight }}
            >
              {preset.sample}
            </span>
            <span className="text-micro text-muted">{preset.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
