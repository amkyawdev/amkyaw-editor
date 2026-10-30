import { useEditorStore } from '../useEditorStore'
import { EmptyState } from './EmptyState'

type FieldKey = 'x' | 'y' | 'scale' | 'rotation'

const FIELDS: Array<{ key: FieldKey; label: string; min: number; max: number; step: number; unit: string }> = [
  { key: 'x', label: 'Position X', min: -500, max: 500, step: 1, unit: 'px' },
  { key: 'y', label: 'Position Y', min: -500, max: 500, step: 1, unit: 'px' },
  { key: 'scale', label: 'Scale', min: 0.1, max: 4, step: 0.05, unit: '×' },
  { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, unit: '°' },
]

/** Full-size transform editor for the selected layer. */
export const TransformSheet = () => {
  const layer = useEditorStore(
    (state) => state.layers.find((candidate) => candidate.id === state.selectedLayerId) ?? null,
  )
  const updateLayerTransform = useEditorStore((state) => state.updateLayerTransform)
  const closeSheet = useEditorStore((state) => state.closeSheet)
  const pushToast = useEditorStore((state) => state.pushToast)

  if (!layer) {
    return (
      <EmptyState
        onAdd={closeSheet}
        title="No layer selected"
        hint="Tap a clip in the timeline to edit its transform"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-muted">{layer.name}</p>
      {FIELDS.map((field) => (
        <div key={field.key} className="rounded-card border border-edge bg-surface2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-body font-label text-ink">{field.label}</span>
            <span className="font-mono text-micro tabular-nums text-secondary">
              {Number(layer.transform[field.key].toFixed(2))}
              {field.unit}
            </span>
          </div>
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={layer.transform[field.key]}
            onChange={(event) =>
              updateLayerTransform(layer.id, { [field.key]: Number(event.target.value) })
            }
            aria-label={field.label}
            className="h-1 w-full accent-secondary"
          />
          <button
            type="button"
            onClick={() => pushToast(`Keyframe set on ${field.label}`, 'success')}
            className="mt-2 text-micro font-label text-primary"
          >
            ◇ Add keyframe at playhead
          </button>
        </div>
      ))}
    </div>
  )
}
