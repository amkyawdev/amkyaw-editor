import { motion } from 'framer-motion'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { formatClock, formatDuration } from '../types'
import { haptics } from '@/mobile/haptics'

/** 48px transport row: current time, large gradient play button, duration. */
export const PlaybackBar = () => {
  const currentTime = useEditorStore((state) => state.currentTime)
  const duration = useEditorStore((state) => state.duration)
  const fps = useEditorStore((state) => state.fps)
  const playing = useEditorStore((state) => state.playing)
  const togglePlayback = useEditorStore((state) => state.togglePlayback)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const setPlaying = useEditorStore((state) => state.setPlaying)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const nudge = (delta: number) => {
    haptics.trigger('light')
    setPlaying(false)
    setCurrentTime(currentTime + delta)
  }

  return (
    <div className="relative shrink-0 border-y border-edge bg-surface1">
      <div className="flex h-playback items-center gap-2 px-3">
        <span className="w-16 font-mono text-body font-label tabular-nums text-secondary">
          {formatClock(currentTime)}
        </span>

        <div className="flex flex-1 items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Back 1 second"
            className="btn-icon pressable"
            onClick={() => nudge(-1)}
          >
            <SkipBack size={18} />
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => {
              haptics.trigger('medium')
              togglePlayback()
            }}
            className="flex h-12 w-12 items-center justify-center rounded-pill text-white"
            style={{
              backgroundImage: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              boxShadow: '0 0 20px rgba(124,58,237,0.4)',
            }}
          >
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </motion.button>

          <button
            type="button"
            aria-label="Forward 1 second"
            className="btn-icon pressable"
            onClick={() => nudge(1)}
          >
            <SkipForward size={18} />
          </button>
        </div>

        <span className="w-16 text-right font-mono text-micro tabular-nums text-muted">
          {formatDuration(duration)}
        </span>
      </div>

      <div className="px-3 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="h-0.5 flex-1 overflow-hidden rounded-pill bg-edge">
            <div
              className="h-full rounded-pill bg-secondary"
              style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(6,182,212,0.8)' }}
            />
          </div>
          <span className="pill bg-surface2 text-muted">{fps} FPS</span>
        </div>
      </div>
    </div>
  )
}
