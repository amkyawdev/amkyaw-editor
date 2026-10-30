import { useUiStore } from '@/store/uiStore'

const toneClasses: Record<string, string> = {
  info: 'border-edge bg-panelAlt text-slate-200',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  error: 'border-danger/40 bg-danger/10 text-danger',
}

export const Toasts = () => {
  const toasts = useUiStore((state) => state.toasts)
  const dismissToast = useUiStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(var(--safe-bottom)+16px)]">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-left text-sm shadow-lg animate-fade-in ${
            toneClasses[toast.tone] ?? toneClasses.info
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  )
}
