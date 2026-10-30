export type Cancelable = { cancel: () => void }

/**
 * Leading-edge throttle. Touch handlers must not be debounced (that would drop
 * the final position), so the trailing call is scheduled instead of discarded.
 */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs = 16,
): ((...args: A) => void) & Cancelable {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: A | null = null

  const invoke = (args: A) => {
    last = Date.now()
    fn(...args)
  }

  const throttled = (...args: A) => {
    const now = Date.now()
    const remaining = waitMs - (now - last)
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      invoke(args)
      return
    }
    pending = args
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      if (pending) {
        const next = pending
        pending = null
        invoke(next)
      }
    }, remaining)
  }

  throttled.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }

  return throttled
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs = 200,
): ((...args: A) => void) & Cancelable {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, waitMs)
  }
  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return debounced
}

/** Coalesces bursts of calls (pointermove, scroll) onto the animation frame. */
export function rafThrottle<A extends unknown[]>(
  fn: (...args: A) => void,
): ((...args: A) => void) & Cancelable {
  let frame: number | null = null
  let pending: A | null = null

  const throttled = (...args: A) => {
    pending = args
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      if (pending) {
        const next = pending
        pending = null
        fn(...next)
      }
    })
  }

  throttled.cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
    pending = null
  }

  return throttled
}
