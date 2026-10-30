import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Maximize2 } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { useGestures } from '@/hooks/useGestures'
import { haptics } from '@/mobile/haptics'
import { clamp } from '@/lib/math'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4

/**
 * Preview stage. Pinch to zoom, drag to pan, double-tap to reset, swipe down to
 * clear zoom. The canvas keeps the project aspect ratio and is letterboxed
 * against a checkerboard so transparency reads correctly.
 */
export const Viewport = () => {
  const resolution = useEditorStore((state) => state.resolution)
  const playing = useEditorStore((state) => state.playing)
  const layers = useEditorStore((state) => state.layers)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const zoom = useEditorStore((state) => state.zoom)
  const setZoom = useEditorStore((state) => state.setZoom)
  const togglePlayback = useEditorStore((state) => state.togglePlayback)
  const currentTime = useEditorStore((state) => state.currentTime)

  const stageRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const gestureStart = useRef({ zoom: 1, x: 0, y: 0 })

  const selected = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [layers, selectedLayerId],
  )

  const aspect = resolution.height > 0 ? resolution.width / resolution.height : 9 / 16

  const reset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // `stageRef` is passed in, so the hook listens to the same node we render.
  useGestures<HTMLDivElement>(
    {
      onPinch: (scale) => {
        setZoom(clamp(gestureStart.current.zoom * scale, MIN_ZOOM, MAX_ZOOM))
      },
      onPanStart: () => {
        gestureStart.current = { zoom, x: pan.x, y: pan.y }
      },
      onPanMove: (dx, dy) => setPan({ x: gestureStart.current.x + dx, y: gestureStart.current.y + dy }),
      onPanEnd: (_dx, dy) => {
        // A decisive downward swipe is the gesture to clear zoom.
        if (dy > 90 && zoom > 1.02) {
          haptics.trigger('light')
          reset()
        }
      },
      onDoubleTap: () => {
        haptics.trigger('light')
        if (zoom > 1.02) reset()
        else setZoom(2)
      },
    },
    stageRef,
  )

  const activeLayers = layers.filter(
    (layer) => layer.visible && currentTime >= layer.start && currentTime <= layer.end,
  )

  return (
    <div
      ref={stageRef}
      className="gesture-surface checkerboard relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
    >
      {/* Corner badges */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex gap-1.5">
        <span className="pill glass border border-edge text-ink">
          {resolution.width}×{resolution.height}
        </span>
        <span className="pill glass border border-edge text-ink">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {zoom > 1.02 ? (
        <button
          type="button"
          onClick={reset}
          className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-pill glass border border-edge px-2.5 py-1 text-micro font-label text-ink pressable"
        >
          <Maximize2 size={12} />
          Reset
        </button>
      ) : null}

      <div
        style={{
          aspectRatio: `${resolution.width} / ${resolution.height}`,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          willChange: 'transform',
          height: aspect < 1 ? '82%' : undefined,
          width: aspect >= 1 ? '88%' : undefined,
        }}
        className="relative max-h-[86%] max-w-[88%] overflow-hidden rounded-card bg-black shadow-float"
      >
        {/* Placeholder preview surface for the mock project */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1030] via-[#0d0d14] to-[#1f0a1a]">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(circle at 30% 20%, rgba(124,58,237,0.55), transparent 55%), radial-gradient(circle at 75% 80%, rgba(236,72,153,0.45), transparent 55%), radial-gradient(circle at 60% 40%, rgba(6,182,212,0.25), transparent 60%)',
            }}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            aria-label={playing ? 'Pause preview' : 'Play preview'}
            onClick={() => {
              haptics.trigger('medium')
              togglePlayback()
            }}
            className="relative z-10 flex h-16 w-16 items-center justify-center rounded-pill glass border border-white/15 text-white"
          >
            {playing ? (
              <span className="flex gap-1.5">
                <span className="block h-6 w-1.5 rounded-pill bg-white" />
                <span className="block h-6 w-1.5 rounded-pill bg-white" />
              </span>
            ) : (
              <Play size={26} fill="currentColor" className="ml-1" />
            )}
          </motion.button>
        </div>

        {/* Selection handles for the active layer */}
        {selected && selected.visible ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-[12%] rounded-[6px] border-2 border-primary"
            style={{ boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          >
            {[
              'left-0 top-0 -translate-x-1/2 -translate-y-1/2',
              'right-0 top-0 translate-x-1/2 -translate-y-1/2',
              'left-0 bottom-0 -translate-x-1/2 translate-y-1/2',
              'right-0 bottom-0 translate-x-1/2 translate-y-1/2',
            ].map((position) => (
              <span
                key={position}
                className={`absolute h-3 w-3 rounded-full border-2 border-white bg-primary ${position}`}
              />
            ))}
            <span className="absolute -top-7 left-0 rounded-pill bg-primary px-2 py-0.5 text-micro font-label text-white">
              {selected.name}
            </span>
          </motion.div>
        ) : null}
      </div>

      {/* Layer strip: tap to select without opening a sheet */}
      <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1.5 px-3">
        {activeLayers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => {
              haptics.trigger('light')
              selectLayer(layer.id)
            }}
            className={`rounded-pill px-2.5 py-1 text-micro font-label pressable ${
              selectedLayerId === layer.id
                ? 'glass border border-primary text-ink'
                : 'glass border border-edge text-muted'
            }`}
          >
            {layer.name}
          </button>
        ))}
      </div>
    </div>
  )
}
