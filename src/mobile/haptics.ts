export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  success: [12, 40, 12],
  warning: [24, 60, 24],
  error: [40, 60, 40, 60, 40],
  selection: 6,
}

const isSupported = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export const haptics = {
  supported: isSupported,

  trigger(pattern: HapticPattern = 'light'): void {
    if (!isSupported()) return
    try {
      navigator.vibrate(PATTERNS[pattern])
    } catch {
      // Vibration can be blocked by the user agent (e.g. no user gesture).
    }
  },

  /** Buzzes only when a continuously dragged value crosses a step boundary. */
  createSnapFeedback(step: number): (value: number) => void {
    let lastBucket: number | null = null
    return (value: number) => {
      const bucket = Math.floor(value / step)
      if (lastBucket !== null && bucket !== lastBucket) this.trigger('selection')
      lastBucket = bucket
    }
  },

  cancel(): void {
    if (!isSupported()) return
    try {
      navigator.vibrate(0)
    } catch {
      // Ignore.
    }
  },
}
