import { motion } from 'framer-motion'
import { Plus, Film } from 'lucide-react'

export type EmptyStateProps = {
  onAdd: () => void
  title?: string
  hint?: string
}

/** Friendly empty state with a gradient illustration and a single clear action. */
export const EmptyState = ({
  onAdd,
  title = 'Nothing here yet',
  hint = 'Tap + to add your first clip',
}: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-edge px-6 py-10 text-center"
  >
    <span
      className="flex h-14 w-14 items-center justify-center rounded-[18px] text-white"
      style={{ backgroundImage: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
    >
      <Film size={24} />
    </span>
    <p className="text-title font-head text-ink">{title}</p>
    <p className="max-w-[220px] text-body text-muted">{hint}</p>
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onAdd}
      className="mt-1 flex h-11 items-center gap-1.5 rounded-btn px-4 text-btn font-btn text-white"
      style={{
        backgroundImage: 'linear-gradient(135deg, #7C3AED, #EC4899)',
        boxShadow: '0 0 20px rgba(124,58,237,0.4)',
      }}
    >
      <Plus size={16} />
      Add clip
    </motion.button>
  </motion.div>
)
