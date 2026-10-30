import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Redo2, Undo2, Upload } from 'lucide-react'
import { useEditorStore } from '../useEditorStore'
import { haptics } from '@/mobile/haptics'

/**
 * 56px glass header. Undo/redo and export are duplicated into the bottom
 * toolbar's reachable zone conceptually, but they live here because they are
 * infrequent actions — the top bar is deliberately not the only path to
 * anything critical.
 */
export const TopBar = () => {
  const projectName = useEditorStore((state) => state.projectName)
  const setProjectName = useEditorStore((state) => state.setProjectName)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const pastLength = useEditorStore((state) => state.past.length)
  const futureLength = useEditorStore((state) => state.future.length)
  const openSheet = useEditorStore((state) => state.openSheet)
  const pushToast = useEditorStore((state) => state.pushToast)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(projectName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed) setProjectName(trimmed)
    else setDraft(projectName)
    setEditing(false)
  }

  return (
    <header className="glass safe-t relative z-30 flex h-topbar shrink-0 items-center gap-1 border-b border-edge px-2">
      <button
        type="button"
        aria-label="Back to projects"
        className="btn-icon pressable"
        onClick={() => {
          haptics.trigger('light')
          pushToast('Back to projects', 'info')
        }}
      >
        <ArrowLeft size={20} />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit()
              if (event.key === 'Escape') {
                setDraft(projectName)
                setEditing(false)
              }
            }}
            className="w-full rounded-card border border-primary/60 bg-surface2 px-2 py-1 text-body font-label text-ink outline-none"
            aria-label="Project name"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(projectName)
              setEditing(true)
            }}
            className="block w-full truncate text-left text-body font-label text-ink"
          >
            {projectName}
          </button>
        )}
      </div>

      <button
        type="button"
        aria-label="Undo"
        disabled={pastLength === 0}
        onClick={() => {
          haptics.trigger('light')
          undo()
        }}
        className={`btn-icon pressable ${pastLength === 0 ? 'text-disabled' : 'text-ink'}`}
      >
        <Undo2 size={19} />
      </button>
      <button
        type="button"
        aria-label="Redo"
        disabled={futureLength === 0}
        onClick={() => {
          haptics.trigger('light')
          redo()
        }}
        className={`btn-icon pressable ${futureLength === 0 ? 'text-disabled' : 'text-ink'}`}
      >
        <Redo2 size={19} />
      </button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          haptics.trigger('medium')
          openSheet('export')
        }}
        className="ml-1 flex h-10 items-center gap-1.5 rounded-pill px-3.5 text-body font-btn text-white"
        style={{
          backgroundImage: 'linear-gradient(135deg, #7C3AED, #EC4899)',
          boxShadow: '0 0 20px rgba(124,58,237,0.4)',
        }}
      >
        <Upload size={16} />
        Export
      </motion.button>
    </header>
  )
}
