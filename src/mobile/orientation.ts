export type Orientation = 'portrait' | 'landscape'
export type OrientationLock = Orientation | 'any'

export type OrientationState = {
  orientation: Orientation
  angle: number
  isPortrait: boolean
  isLandscape: boolean
  width: number
  height: number
}

const readState = (): OrientationState => {
  if (typeof window === 'undefined') {
    return { orientation: 'portrait', angle: 0, isPortrait: true, isLandscape: false, width: 0, height: 0 }
  }
  const width = window.innerWidth
  const height = window.innerHeight
  const isLandscape = width > height
  const angle =
    typeof screen !== 'undefined' && typeof screen.orientation?.angle === 'number'
      ? screen.orientation.angle
      : isLandscape
        ? 90
        : 0
  return {
    orientation: isLandscape ? 'landscape' : 'portrait',
    angle,
    isPortrait: !isLandscape,
    isLandscape,
    width,
    height,
  }
}

export const observeOrientation = (listener: (state: OrientationState) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {}
  const notify = () => listener(readState())
  notify()

  window.addEventListener('resize', notify)
  window.addEventListener('orientationchange', notify)
  screen.orientation?.addEventListener?.('change', notify)

  return () => {
    window.removeEventListener('resize', notify)
    window.removeEventListener('orientationchange', notify)
    screen.orientation?.removeEventListener?.('change', notify)
  }
}

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'portrait' | 'landscape' | 'any') => Promise<void>
}

export const orientation = {
  get: readState,

  async lock(mode: OrientationLock): Promise<boolean> {
    if (typeof screen === 'undefined') return false
    const target = screen.orientation as LockableOrientation | undefined
    if (!target?.lock) return false
    try {
      await target.lock(mode === 'any' ? 'any' : mode)
      return true
    } catch {
      // Requires fullscreen on most browsers; silently degrade.
      return false
    }
  },

  unlock(): void {
    if (typeof screen === 'undefined') return
    const target = screen.orientation as LockableOrientation | undefined
    if (!target?.lock) return
    void target.lock('any').catch(() => undefined)
  },
}

/** Safe-area insets for notch and home-indicator aware layouts. */
export const readSafeAreaInsets = (): { top: number; bottom: number; left: number; right: number } => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);' +
    'left:env(safe-area-inset-left);right:env(safe-area-inset-right);pointer-events:none;visibility:hidden'
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const inset = {
    top: Number.parseFloat(style.top) || 0,
    bottom: Number.parseFloat(style.bottom) || 0,
    left: Number.parseFloat(style.left) || 0,
    right: Number.parseFloat(style.right) || 0,
  }
  probe.remove()
  return inset
}
