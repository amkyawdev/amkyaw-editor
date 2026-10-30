import { create } from 'zustand'
import type { Project } from '@/types/project'

export type HistoryEntry = {
  label: string
  before: Project
  after: Project
  timestamp: number
}

export type HistoryState = {
  past: HistoryEntry[]
  future: HistoryEntry[]
  limit: number
  canUndo: boolean
  canRedo: boolean
  push: (label: string, before: Project, after: Project) => void
  undo: () => Project | null
  redo: () => Project | null
  clear: () => void
}

const DEFAULT_LIMIT = 100

const unchanged = (before: Project, after: Project): boolean =>
  before === after || (before.updatedAt === after.updatedAt && before.layers === after.layers)

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  limit: DEFAULT_LIMIT,
  canUndo: false,
  canRedo: false,

  push: (label, before, after) => {
    if (unchanged(before, after)) return
    set((state) => {
      const past = [...state.past, { label, before, after, timestamp: Date.now() }]
      const trimmed = past.length > state.limit ? past.slice(past.length - state.limit) : past
      return { past: trimmed, future: [], canUndo: true, canRedo: false }
    })
  },

  undo: () => {
    const state = get()
    const entry = state.past[state.past.length - 1]
    if (!entry) return null
    set({
      past: state.past.slice(0, -1),
      future: [entry, ...state.future],
      canUndo: state.past.length > 1,
      canRedo: true,
    })
    return entry.before
  },

  redo: () => {
    const state = get()
    const [entry, ...rest] = state.future
    if (!entry) return null
    set({
      past: [...state.past, entry],
      future: rest,
      canUndo: true,
      canRedo: rest.length > 0,
    })
    return entry.after
  },

  clear: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}))

export const selectCanUndo = (state: HistoryState): boolean => state.canUndo
export const selectCanRedo = (state: HistoryState): boolean => state.canRedo
export const selectUndoLabel = (state: HistoryState): string | null =>
  state.past[state.past.length - 1]?.label ?? null
export const selectRedoLabel = (state: HistoryState): string | null => state.future[0]?.label ?? null
