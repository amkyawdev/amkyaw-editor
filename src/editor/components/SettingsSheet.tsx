import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gauge } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { haptics } from '@/mobile/haptics'

/** Project stats plus the three behaviour toggles. */
export const SettingsSheet = () => {
  const resolution = useEditorStore((state) => state.resolution)
  const fps = useEditorStore((state) => state.fps)
  const duration = useEditorStore((state) => state.duration)
  const layers = useEditorStore((state) => state.layers)
  const clips = useEditorStore((state) => state.clips)
  const pushToast = useEditorStore((state) => state.pushToast)

  const [autoSave, setAutoSave] = useState(true)
  const [grid, setGrid] = useState(false)
  const [snap, setSnap] = useState(true)

  const stats = [
    { label: 'Resolution', value: `${resolution.width}×${resolution.height}` },
    { label: 'Frame rate', value: `${fps} fps` },
    { label: 'Duration', value: `${duration}s` },
    { label: 'Layers', value: `${layers.length} / ${clips.length} clips` },
  ]

  const toggles = [
    { label: 'Auto-save', value: autoSave, set: setAutoSave },
    { label: 'Show grid', value: grid, set: setGrid },
    { label: 'Snap to clips', value: snap, set: setSnap },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card border border-edge bg-surface2 p-3">
            <p className="label-micro">{stat.label}</p>
            <p className="mt-1 font-mono text-body text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      {toggles.map((toggle) => (
        <button
          key={toggle.label}
          type="button"
          role="switch"
          aria-checked={toggle.value}
          onClick={() => {
            haptics.trigger('light')
            toggle.set(!toggle.value)
          }}
          className="flex items-center justify-between rounded-card border border-edge bg-surface2 px-3 py-3 pressable"
        >
          <span className="text-body font-label text-ink">{toggle.label}</span>
          <span
            className={`flex h-6 w-11 items-center rounded-pill p-0.5 transition-colors ${
              toggle.value ? 'bg-primary' : 'bg-edge'
            }`}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className={`h-5 w-5 rounded-pill bg-white ${toggle.value ? 'ml-auto' : ''}`}
            />
          </span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => pushToast('Storage is per-device; nothing is uploaded', 'info')}
        className="flex h-11 items-center justify-center gap-2 rounded-btn border border-edge bg-surface2 text-btn font-btn text-ink pressable"
      >
        <Gauge size={16} />
        Performance & storage
      </button>
    </div>
  )
}
