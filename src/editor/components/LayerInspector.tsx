import { Diamond, Lock, Unlock, Trash2 } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { LAYER_COLORS, LAYER_LABELS } from '../types'
import { haptics } from '@/mobile/haptics'

type RowProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  keyframed: boolean
  onChange: (value: number) => void
  onKeyframe: () => void
}

/** One labelled slider with a keyframe toggle. Cyan thumb per the design system. */
const SliderRow = ({ label, value, min, max, step = 1, unit = '', keyframed, onChange, onKeyframe }: RowProps) => {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-micro font-label text-muted">{label}</span>

      <div className="relative flex h-8 flex-1 items-center">
        <div className="absolute inset-x-0 h-1 rounded-pill bg-edge">
          <div className="h-full rounded-pill bg-secondary" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-pill
            [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:shadow-glow-cyan
            [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-pill
            [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-secondary"
        />
      </div>

      <span className="w-12 shrink-0 text-right font-mono text-micro tabular-nums text-ink">
        {Number(value.toFixed(1))}
        {unit}
      </span>

      <button
        type="button"
        aria-label={`Keyframe ${label}`}
        aria-pressed={keyframed}
        onClick={() => {
          haptics.trigger('selection')
          onKeyframe()
        }}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] pressable ${
          keyframed ? 'bg-primary-soft text-primary' : 'text-muted'
        }`}
      >
        <Diamond size={14} fill={keyframed ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

/**
 * Context-aware inspector for the selected layer. Renders nothing when the
 * selection is empty so it never occludes the viewport pointlessly.
 */
export const LayerInspector = () => {
  const layer = useEditorStore((state) =>
    state.layers.find((candidate) => candidate.id === state.selectedLayerId) ?? null,
  )
  const updateLayerTransform = useEditorStore((state) => state.updateLayerTransform)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const removeLayer = useEditorStore((state) => state.removeLayer)
  const pushToast = useEditorStore((state) => state.pushToast)

  if (!layer) return null

  return (
    <div className="pointer-events-auto mx-3 mb-2 shrink-0 overflow-hidden rounded-card border border-edge bg-surface2/95 shadow-float backdrop-blur-glass">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <span
          className="h-2 w-2 shrink-0 rounded-pill"
          style={{ backgroundColor: LAYER_COLORS[layer.kind] }}
        />
        <span className="min-w-0 flex-1 truncate text-body font-label text-ink">{layer.name}</span>
        <span className="pill bg-surface1 text-muted">{LAYER_LABELS[layer.kind]}</span>
        <button
          type="button"
          aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
          onClick={() => {
            haptics.trigger('light')
            updateLayer(layer.id, { locked: !layer.locked })
          }}
          className="btn-icon pressable"
        >
          {layer.locked ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
        <button
          type="button"
          aria-label="Delete layer"
          onClick={() => {
            haptics.trigger('warning')
            removeLayer(layer.id)
            pushToast(`Deleted ${layer.name}`, 'danger')
          }}
          className="btn-icon pressable text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="flex flex-col gap-1 px-3 py-2">
        <SliderRow
          label="X"
          value={layer.transform.x}
          min={-500}
          max={500}
          keyframed={false}
          onChange={(x) => updateLayerTransform(layer.id, { x })}
          onKeyframe={() => pushToast(`Keyframe added on X at ${layer.transform.x}`, 'success')}
        />
        <SliderRow
          label="Y"
          value={layer.transform.y}
          min={-500}
          max={500}
          keyframed={false}
          onChange={(y) => updateLayerTransform(layer.id, { y })}
          onKeyframe={() => pushToast(`Keyframe added on Y at ${layer.transform.y}`, 'success')}
        />
        <SliderRow
          label="Scale"
          value={layer.transform.scale}
          min={0.1}
          max={4}
          step={0.05}
          unit="×"
          keyframed={false}
          onChange={(scale) => updateLayerTransform(layer.id, { scale })}
          onKeyframe={() => pushToast('Keyframe added on Scale', 'success')}
        />
        <SliderRow
          label="Rotation"
          value={layer.transform.rotation}
          min={-180}
          max={180}
          unit="°"
          keyframed={false}
          onChange={(rotation) => updateLayerTransform(layer.id, { rotation })}
          onKeyframe={() => pushToast('Keyframe added on Rotation', 'success')}
        />
        <SliderRow
          label="Opacity"
          value={layer.opacity}
          min={0}
          max={1}
          step={0.01}
          keyframed={false}
          onChange={(opacity) => updateLayer(layer.id, { opacity })}
          onKeyframe={() => pushToast('Keyframe added on Opacity', 'success')}
        />
      </div>
    </div>
  )
}
