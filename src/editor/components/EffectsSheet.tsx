import { motion } from 'framer-motion'
import { Sparkles, Wand2 } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { EFFECT_LIBRARY } from '../mockData'
import { haptics } from '@/mobile/haptics'

/**
 * Two-column effect grid over a 16px gap, per the design spec. Applied effects
 * get an inline intensity slider so tuning does not require another screen.
 */
export const EffectsSheet = () => {
  const applied = useEditorStore((state) => state.appliedEffects)
  const addEffect = useEditorStore((state) => state.addEffect)
  const toggleEffect = useEditorStore((state) => state.toggleEffect)
  const removeEffect = useEditorStore((state) => state.removeEffect)
  const setEffectIntensity = useEditorStore((state) => state.setEffectIntensity)
  const pushToast = useEditorStore((state) => state.pushToast)

  return (
    <div className="flex flex-col gap-4">
      {applied.length > 0 ? (
        <div>
          <p className="label-micro mb-2">Applied</p>
          <div className="flex flex-col gap-2">
            {applied.map((effect) => (
              <div key={effect.id} className="rounded-card border border-edge bg-surface2 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-primary-soft text-primary">
                    <Wand2 size={14} />
                  </span>
                  <span className="flex-1 text-body font-label text-ink">{effect.name}</span>
                  <button
                    type="button"
                    aria-label={effect.enabled ? `Disable ${effect.name}` : `Enable ${effect.name}`}
                    onClick={() => {
                      haptics.trigger('light')
                      toggleEffect(effect.id)
                    }}
                    className={`pill border ${
                      effect.enabled ? 'border-success/40 text-success' : 'border-edge text-disabled'
                    }`}
                  >
                    {effect.enabled ? 'On' : 'Off'}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${effect.name}`}
                    onClick={() => removeEffect(effect.id)}
                    className="text-micro font-label text-danger"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={effect.intensity}
                  onChange={(event) => setEffectIntensity(effect.id, Number(event.target.value))}
                  aria-label={`${effect.name} intensity`}
                  className="mt-2 h-1 w-full accent-secondary"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="label-micro mb-2">Library</p>
        <div className="grid grid-cols-2 gap-4">
          {EFFECT_LIBRARY.map((effect) => (
            <motion.button
              key={effect.id}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                haptics.trigger('medium')
                addEffect(effect.id, effect.name)
                pushToast(`${effect.name} applied`, 'success')
              }}
              className="flex flex-col gap-2 text-left"
            >
              <span
                className={`flex h-20 items-center justify-center rounded-card border border-edge bg-gradient-to-br text-2xl text-white/95 ${effect.gradient}`}
              >
                {effect.glyph}
              </span>
              <span className="flex items-center gap-1 text-micro font-label text-ink">
                <Sparkles size={11} className="text-primary" />
                {effect.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
