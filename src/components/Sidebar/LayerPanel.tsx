import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'
import { useUiStore } from '@/store/uiStore'
import { createEffectInstance } from '@/core/effects/presets'
import { effectDefinitions } from '@/core/effects/definitions'
import { animationPresets } from '@/animations/presets'
import { useAnimation } from '@/hooks/useAnimation'
import { haptics } from '@/mobile/haptics'
import type { LayerType } from '@/types/layer'
import type { EffectKind } from '@/types/effect'

const LAYER_TYPES: Array<{ type: LayerType; label: string }> = [
  { type: 'video', label: 'Video' },
  { type: 'image', label: 'Image' },
  { type: 'text', label: 'Text' },
  { type: 'shape', label: 'Shape' },
  { type: 'audio', label: 'Audio' },
  { type: 'adjustment', label: 'Adjustment' },
]

export type LayerPanelProps = {
  compact?: boolean
}

/** Layer list + add-layer actions. Shared by desktop sidebar and mobile sheet. */
export const LayerPanel = ({ compact = false }: LayerPanelProps) => {
  const layers = useProjectStore((state) => state.project.layers)
  const addLayer = useProjectStore((state) => state.addLayer)
  const updateLayer = useProjectStore((state) => state.updateLayer)
  const removeLayer = useProjectStore((state) => state.removeLayer)
  const duplicateLayer = useProjectStore((state) => state.duplicateLayer)
  const reorderLayers = useProjectStore((state) => state.reorderLayers)

  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const openSheet = useUiStore((state) => state.openSheet)
  const pushToast = useUiStore((state) => state.pushToast)

  const addEffect = useProjectStore((state) => state.addEffect)
  const removeEffect = useProjectStore((state) => state.removeEffect)
  const updateEffect = useProjectStore((state) => state.updateEffect)
  const effects = useProjectStore((state) => state.project.effects)
  const { applyPreset } = useAnimation()

  const selected = layers.find((layer) => layer.id === selectedLayerId) ?? null
  const selectedEffects = effects.filter((effect) => effect.layerId === selectedLayerId)

  const onAdd = (type: LayerType) => {
    haptics.trigger('light')
    const layer = addLayer(type)
    selectLayer(layer.id)
    pushToast(`Added ${layer.name}`, 'success')
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">Add layer</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LAYER_TYPES.map((entry) => (
            <button key={entry.type} type="button" className="chip hover:border-accent hover:text-accent" onClick={() => onAdd(entry.type)}>
              + {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Layers ({layers.length})</span>
        <ul className="mt-1.5 flex flex-col gap-1">
          {layers.length === 0 ? (
            <li className="rounded-lg border border-dashed border-edge px-3 py-4 text-center text-xs text-slate-500">
              No layers yet. Add a text or shape layer to get started.
            </li>
          ) : null}
          {[...layers].reverse().map((layer, reverseIndex) => {
            const index = layers.length - 1 - reverseIndex
            const active = layer.id === selectedLayerId
            return (
              <li
                key={layer.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                  active ? 'border-accent bg-accentSoft/30' : 'border-edge bg-panelAlt'
                }`}
              >
                <button
                  type="button"
                  className="touch-target shrink-0 text-xs"
                  aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                  onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                >
                  {layer.visible ? '👁' : '🚫'}
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => {
                    selectLayer(layer.id)
                    if (compact) openSheet('properties')
                  }}
                >
                  {layer.name}
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    className="touch-target text-xs text-slate-400"
                    aria-label="Move up"
                    disabled={index === layers.length - 1}
                    onClick={() => reorderLayers(index, index + 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="touch-target text-xs text-slate-400"
                    aria-label="Move down"
                    disabled={index === 0}
                    onClick={() => reorderLayers(index, index - 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="touch-target text-xs text-slate-400"
                    aria-label="Duplicate layer"
                    onClick={() => duplicateLayer(layer.id)}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    className="touch-target text-xs text-danger"
                    aria-label="Delete layer"
                    onClick={() => {
                      haptics.trigger('warning')
                      removeLayer(layer.id)
                    }}
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {selected ? (
        <div>
          <span className="label">Effects on {selected.name}</span>
          <ul className="mt-1.5 flex flex-col gap-1">
            {selectedEffects.map((effect) => {
              const definition = effectDefinitions[effect.kind]
              return (
                <li key={effect.id} className="rounded-lg border border-edge bg-panelAlt px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={effect.enabled}
                      aria-label={`Toggle ${definition?.label ?? effect.kind}`}
                      onChange={(event) => updateEffect(effect.id, { enabled: event.target.checked })}
                    />
                    <span className="flex-1 text-sm">{definition?.label ?? effect.kind}</span>
                    <button
                      type="button"
                      className="touch-target text-xs text-danger"
                      aria-label="Remove effect"
                      onClick={() => removeEffect(effect.id)}
                    >
                      ✕
                    </button>
                  </div>
                  {definition?.params.map((param) => (
                    <label key={param.name} className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-16 shrink-0 truncate">{param.label}</span>
                      <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={effect.values[param.name] ?? param.default}
                        onChange={(event) =>
                          updateEffect(effect.id, {
                            values: { ...effect.values, [param.name]: Number(event.target.value) },
                          })
                        }
                        className="h-1 flex-1 accent-accent"
                      />
                      <span className="w-10 text-right tabular-nums">
                        {Number((effect.values[param.name] ?? param.default).toFixed(2))}
                      </span>
                    </label>
                  ))}
                </li>
              )
            })}
          </ul>

          <div className="mt-2">
            <span className="label">Add effect</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(Object.keys(effectDefinitions) as EffectKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className="chip hover:border-accent hover:text-accent"
                  onClick={() => addEffect(selected.id, createEffectInstance(selected.id, kind))}
                >
                  {effectDefinitions[kind].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <span className="label">Animation presets</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {animationPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="chip hover:border-accent hover:text-accent"
                  onClick={() => {
                    applyPreset(selected.id, preset)
                    pushToast(`Applied ${preset.name}`, 'success')
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
