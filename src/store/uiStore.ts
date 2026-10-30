import { create } from 'zustand'

export type SheetId =
  | 'none'
  | 'layers'
  | 'effects'
  | 'properties'
  | 'assets'
  | 'export'
  | 'presets'
  | 'settings'

export type ViewportMode = 'fit' | 'fill' | '100%' | 'custom'

export type UiState = {
  sheet: SheetId
  sheetHeight: number
  sidebarOpen: boolean
  inspectorOpen: boolean
  floatingMenu: { open: boolean; x: number; y: number }
  toasts: Array<{ id: string; message: string; tone: 'info' | 'success' | 'error' }>
  viewportMode: ViewportMode
  safeArea: { top: number; bottom: number; left: number; right: number }
  openSheet: (sheet: SheetId) => void
  closeSheet: () => void
  toggleSheet: (sheet: SheetId) => void
  setSheetHeight: (height: number) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setInspectorOpen: (open: boolean) => void
  openFloatingMenu: (x: number, y: number) => void
  closeFloatingMenu: () => void
  pushToast: (message: string, tone?: 'info' | 'success' | 'error') => void
  dismissToast: (id: string) => void
  setViewportMode: (mode: ViewportMode) => void
  setSafeArea: (area: Partial<UiState['safeArea']>) => void
}

let toastSeq = 0

export const useUiStore = create<UiState>((set, get) => ({
  sheet: 'none',
  sheetHeight: 0.45,
  sidebarOpen: true,
  inspectorOpen: true,
  floatingMenu: { open: false, x: 0, y: 0 },
  toasts: [],
  viewportMode: 'fit',
  safeArea: { top: 0, bottom: 0, left: 0, right: 0 },

  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: 'none' }),
  toggleSheet: (sheet) => set({ sheet: get().sheet === sheet ? 'none' : sheet }),
  setSheetHeight: (height) => set({ sheetHeight: Math.min(0.92, Math.max(0.2, height)) }),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),

  openFloatingMenu: (x, y) => set({ floatingMenu: { open: true, x, y } }),
  closeFloatingMenu: () => set({ floatingMenu: { open: false, x: 0, y: 0 } }),

  pushToast: (message, tone = 'info') => {
    toastSeq += 1
    const id = `toast_${toastSeq}`
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    setTimeout(() => get().dismissToast(id), 4000)
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  setViewportMode: (viewportMode) => set({ viewportMode }),

  setSafeArea: (area) => set((state) => ({ safeArea: { ...state.safeArea, ...area } })),
}))
