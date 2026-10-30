import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Download, Image as ImageIcon } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { haptics } from '@/mobile/haptics'

const FORMATS = ['MP4', 'MOV', 'GIF', 'PNG'] as const
const QUALITIES = ['720p', '1080p', '4K'] as const

type Format = (typeof FORMATS)[number]
type Quality = (typeof QUALITIES)[number]

/**
 * Export flow with a mock render pass. The progress interval is cleared on
 * unmount so closing the sheet mid-render cannot leave a timer running.
 */
export const ExportSheet = () => {
  const closeSheet = useEditorStore((state) => state.closeSheet)
  const pushToast = useEditorStore((state) => state.pushToast)
  const resolution = useEditorStore((state) => state.resolution)

  const [format, setFormat] = useState<Format>('MP4')
  const [quality, setQuality] = useState<Quality>('1080p')
  const [progress, setProgress] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const start = () => {
    haptics.trigger('medium')
    stop()
    setDone(false)
    setProgress(0)

    let value = 0
    timerRef.current = setInterval(() => {
      value += 7 + Math.random() * 9
      if (value >= 100) {
        stop()
        setProgress(100)
        setTimeout(() => {
          setProgress(null)
          setDone(true)
          haptics.trigger('success')
          pushToast(`Exported ${format} · ${quality}`, 'success')
        }, 320)
        return
      }
      setProgress(value)
    }, 140)
  }

  const estimatedMb = quality === '4K' ? 96.4 : quality === '1080p' ? 24.6 : 9.8

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="label-micro mb-2">Format</p>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                haptics.trigger('light')
                setFormat(option)
              }}
              className={`pill border pressable ${
                format === option ? 'border-primary bg-primary-soft text-primary' : 'border-edge text-muted'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label-micro mb-2">Quality</p>
        <div className="flex flex-wrap gap-2">
          {QUALITIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                haptics.trigger('light')
                setQuality(option)
              }}
              className={`pill border pressable ${
                quality === option ? 'border-primary bg-primary-soft text-primary' : 'border-edge text-muted'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-edge bg-surface2 p-3">
        <div className="flex items-center gap-2 text-body text-muted">
          <ImageIcon size={14} />
          <span className="font-mono">
            {resolution.width}×{resolution.height}
          </span>
          <span className="ml-auto">≈ {estimatedMb} MB</span>
        </div>
      </div>

      {progress !== null ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-micro font-label text-muted">
            <span>{progress >= 100 ? 'Finishing…' : 'Rendering frames…'}</span>
            <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-edge">
            <motion.div
              className="h-full rounded-pill bg-secondary"
              style={{ boxShadow: '0 0 12px rgba(6,182,212,0.8)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>
      ) : null}

      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 rounded-card border border-success/40 bg-success/10 p-3"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-success text-white">
            <Check size={16} />
          </span>
          <div className="flex-1">
            <p className="text-body font-label text-success">Export complete</p>
            <p className="text-micro text-muted">Saved to your device</p>
          </div>
        </motion.div>
      ) : null}

      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        disabled={progress !== null}
        onClick={start}
        className="flex h-12 items-center justify-center gap-2 rounded-btn text-btn font-btn text-white disabled:opacity-60"
        style={{
          backgroundImage: 'linear-gradient(135deg, #7C3AED, #EC4899)',
          boxShadow: '0 0 20px rgba(124,58,237,0.4)',
        }}
      >
        <Download size={18} />
        {progress !== null ? 'Exporting…' : 'Export video'}
      </motion.button>

      <button type="button" onClick={closeSheet} className="text-micro font-label text-muted">
        Cancel
      </button>
    </div>
  )
}
