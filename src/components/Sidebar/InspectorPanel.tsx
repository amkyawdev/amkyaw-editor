import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'
import { NumberDrag } from '@/components/common/NumberDrag'
import { useAnimation } from '@/hooks/useAnimation'
import { effectDefinitions } from '@/core/effects/definitions'
import { animationPresets } from '@/animations/presets'
import { createEffectInstance } from '@/core/effects/presets'
import { FPS_PRESETS } from '@/lib/time'
import type { AnimatableProperty } from '@/types/animation'
import type { EffectKind } from '@/types/effect'

const TRANSFORM_FIELDS: Array<{ property: AnimatableProperty; label: string; step: number }> = [
  { property: 'position.x', label: 'X', step: 1 },
  { property: 'position.y', label: 'Y', step: 1 },
  { property: 'scale.x', label: 'Scale X', step: 0.01 },
  { property: 'scale.y', label: 'Scale Y', step: 0.01 },
  { property: 'rotation', label: 'Rotation', step: 1 },
]

export type InspectorPanelProps = {
  compact?: boolean
}

/**
 * Property inspector for the selected layer. Every numeric field supports both
 * scrub-drag and double-tap-to-type, and each transform row can key itself at
 * the playhead in one tap.
 */
export const InspectorPanel = ({ compact = false }: InspectorPanelProps) => {
  const layers = useProjectStore((state) => state.project.layers)
  const effects = useProjectStore((state) => state.project.effects)
  const fps = useProjectStore((state) => state.project.fps)
  const durationFrames = useProjectStore((state) => state.project.durationFrames)
  const updateLayer = useProjectStore((state) => state.updateLayer)
  const setFps = useProjectStore((state) => state.setFps)
  const setDuration = useProjectStore((state) => state.setDuration)
  const addEffect = useProjectStore((state) => state.addEffect)

  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const currentFrame = useEditorStore((state) => state.currentFrame)

  const { addKeyframe, trackFor } = useAnimation()

  const layer = layers.find((candidate) => candidate.id === selectedLayerId) ?? null
  const layerEffects = effects.filter((effect) => effect.layerId === selectedLayerId)

  const hasKeyframe = (property: AnimatableProperty) =>
    layer ? Boolean(trackFor(layer.id, property)?.keyframes.some((kf) => kf.frame === currentFrame)) : false

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="label">Project</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">Frame rate</span>
            <select
              className="field"
              value={fps}
              onChange={(event) => setFps(Number(event.target.value))}
            >
              {FPS_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset} fps
                </option>
              ))}
            </select>
          </label>
          <NumberDrag
            label="Duration"
            value={durationFrames}
            min={1}
            max={60 * fps * 60}
            step={1}
            precision={0}
            suffix="f"
            onChange={setDuration}
          />
        </div>
      </div>

      {!layer ? (
        <p className="rounded-lg border border-dashed border-edge px-3 py-6 text-center text-xs text-slate-500">
          Select a layer to edit its properties.
        </p>
      ) : (
        <>
          <div>
            <span className="label">Layer</span>
            <div className="mt-1.5 flex flex-col gap-2">
              <input
                className="field"
                value={layer.name}
                onChange={(event) => updateLayer(layer.id, { name: event.target.value })}
                aria-label="Layer name"
              />
              <div className="grid grid-cols-2 gap-2">
                <NumberDrag
                  label="Start"
                  value={layer.startFrame}
                  min={0}
                  max={durationFrames}
                  step={1}
                  precision={0}
                  onChange={(value) => updateLayer(layer.id, { startFrame: Math.round(value) })}
                />
                <NumberDrag
                  label="End"
                  value={layer.endFrame}
                  min={0}
                  max={durationFrames}
                  step={1}
                  precision={0}
                  onChange={(value) => updateLayer(layer.id, { endFrame: Math.round(value) })}
                />
              </div>
              <NumberDrag
                label="Opacity"
                value={layer.opacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => updateLayer(layer.id, { opacity: value })}
              />
            </div>
          </div>

          <div>
            <span className="label">Transform</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {TRANSFORM_FIELDS.map((field) => {
                const value =
                  field.property === 'position.x'
                    ? layer.transform.position.x
                    : field.property === 'position.y'
                      ? layer.transform.position.y
                      : field.property === 'scale.x'
                        ? layer.transform.scale.x
                        : field.property === 'scale.y'
                          ? layer.transform.scale.y
                          : layer.transform.rotation
                return (
                  <div key={field.property} className="flex items-center gap-1">
                    <NumberDrag
                      label={field.label}
                      value={value}
                      step={field.step}
                      onChange={(next) => {
                        const transform = { ...layer.transform }
                        if (field.property === 'position.x') transform.position = { ...transform.position, x: next }
                        else if (field.property === 'position.y') transform.position = { ...transform.position, y: next }
                        else if (field.property === 'scale.x') transform.scale = { ...transform.scale, x: next }
                        else if (field.property === 'scale.y') transform.scale = { ...transform.scale, y: next }
                        else transform.rotation = next
                        updateLayer(layer.id, { transform })
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`Keyframe ${field.label}`}
                      className={`touch-target shrink-0 rounded-lg border text-xs ${
                        hasKeyframe(field.property)
                          ? 'border-accent bg-accent text-white'
                          : 'border-edge text-slate-400'
                      }`}
                      onClick={() => addKeyframe(layer.id, field.property, value)}
                    >
                      ◆
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {layer.text ? (
            <div>
              <span className="label">Text</span>
              <textarea
                className="field mt-1.5 min-h-[72px]"
                value={layer.text.content}
                onChange={(event) =>
                  updateLayer(layer.id, { text: { ...layer.text!, content: event.target.value } })
                }
                aria-label="Text content"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <NumberDrag
                  label="Size"
                  value={layer.text.fontSize}
                  min={8}
                  max={400}
                  step={1}
                  precision={0}
                  onChange={(value) => updateLayer(layer.id, { text: { ...layer.text!, fontSize: value } })}
                />
                <NumberDrag
                  label="Weight"
                  value={layer.text.fontWeight}
                  min={100}
                  max={900}
                  step={100}
                  precision={0}
                  onChange={(value) => updateLayer(layer.id, { text: { ...layer.text!, fontWeight: value } })}
                />
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between">
              <span className="label">Effects ({layerEffects.length})</span>
              <button
                type="button"
                className="chip"
                onClick={() => addEffect(layer.id, createEffectInstance(layer.id, 'brightness'))}
              >
                + Add
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(Object.keys(effectDefinitions) as EffectKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className="chip hover:border-accent hover:text-accent"
                  onClick={() => addEffect(layer.id, createEffectInstance(layer.id, kind))}
                >
                  {effectDefinitions[kind].label}
                </button>
              ))}
            </div>
          </div>

          {compact ? (
            <div>
              <span className="label">Presets</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {animationPresets.map((preset) => (
                  <span key={preset.id} className="chip">
                    {preset.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
