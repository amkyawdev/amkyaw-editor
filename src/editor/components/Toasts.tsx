import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import type { Toast } from '../types'

const TONES: Record<Toast['tone'], { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'border-edge text-ink' },
  success: { icon: CheckCircle2, className: 'border-success/40 text-success' },
  warning: { icon: AlertTriangle, className: 'border-warning/40 text-warning' },
  danger: { icon: XCircle, className: 'border-danger/40 text-danger' },
}

/**
 * Toast stack. Sits above the toolbar (not over it) so the primary actions stay
 * tappable while a message is on screen.
 */
export const Toasts = () => {
  const toasts = useEditorStore((state) => state.toasts)
  const dismissToast = useEditorStore((state) => state.dismissToast)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--toolbar-height)+var(--safe-bottom)+12px)] z-[60] flex flex-col items-center gap-2 px-3">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONES[toast.tone]
          const Icon = tone.icon
          return (
            <motion.button
              key={toast.id}
              type="button"
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={() => dismissToast(toast.id)}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-card border px-3 py-2.5 text-left text-body font-label shadow-float glass ${tone.className}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="min-w-0 flex-1">{toast.message}</span>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
