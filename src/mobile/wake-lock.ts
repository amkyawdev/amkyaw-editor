export type WakeLockState = 'active' | 'released' | 'unsupported' | 'denied'

type Sentinel = { released: boolean; release: () => Promise<void>; addEventListener: (type: string, listener: () => void) => void }

type WakeLockCapableNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<Sentinel> }
}

/**
 * Keeps the screen awake while previewing or exporting. The lock is dropped by
 * the browser whenever the page is hidden, so it is re-acquired on visibility
 * change — without that, exports fail when the user switches apps.
 */
export class WakeLockController {
  private sentinel: Sentinel | null = null
  private wanted = false
  private state: WakeLockState = 'unsupported'
  private listeners = new Set<(state: WakeLockState) => void>()
  private boundVisibility = () => {
    if (document.visibilityState === 'visible' && this.wanted) void this.acquire()
  }

  get current(): WakeLockState {
    return this.state
  }

  subscribe(listener: (state: WakeLockState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(state: WakeLockState): void {
    this.state = state
    for (const listener of this.listeners) listener(state)
  }

  async acquire(): Promise<WakeLockState> {
    this.wanted = true
    const nav = navigator as WakeLockCapableNavigator
    if (!nav.wakeLock?.request) {
      this.setState('unsupported')
      return 'unsupported'
    }
    try {
      this.sentinel = await nav.wakeLock.request('screen')
      this.sentinel.addEventListener('release', () => {
        if (this.wanted && document.visibilityState === 'visible') void this.acquire()
      })
      document.addEventListener('visibilitychange', this.boundVisibility)
      this.setState('active')
      return 'active'
    } catch {
      this.setState('denied')
      return 'denied'
    }
  }

  async release(): Promise<void> {
    this.wanted = false
    document.removeEventListener('visibilitychange', this.boundVisibility)
    if (this.sentinel && !this.sentinel.released) {
      try {
        await this.sentinel.release()
      } catch {
        // Already released.
      }
    }
    this.sentinel = null
    this.setState('released')
  }
}

export const wakeLock = new WakeLockController()
