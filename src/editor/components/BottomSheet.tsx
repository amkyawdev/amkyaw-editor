import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { haptics } from '@/mobile/haptics'

export type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Fraction of viewport height; 0.5 is the spec default. */
  height?: number
  footer?: React.ReactNode
}

/**
 * Slide-up sheet with a drag handle. Dragging the handle past a quarter of its
 * height dismisses the sheet; the backdrop fades in with blur.
 */
export const BottomSheet = ({ open, onClose, title, children, height = 0.5, footer }: BottomSheetProps) => {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            aria-label="Close sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_event, info) => {
              // Dismiss on a decisive downward drag or flick.
              if (info.offset.y > 120 || info.velocity.y > 500) {
                haptics.trigger('light')
                onClose()
              }
            }}
            className="glass absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-sheet border-t border-edge shadow-float"
            style={{ height: `${height * 100}%` }}
          >
            <div className="flex shrink-0 cursor-grab flex-col items-center pt-2 active:cursor-grabbing">
              <span className="h-1 w-10 rounded-pill bg-edge" aria-hidden />
            </div>

            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
              <h2 className="text-title font-head text-ink">{title}</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="btn-icon pressable"
              >
                <X size={20} />
              </button>
            </div>

            <div className="scroll-y min-h-0 flex-1 px-4 pb-4">{children}</div>
            {footer ? <div className="shrink-0 border-t border-edge px-4 py-3 safe-b">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
