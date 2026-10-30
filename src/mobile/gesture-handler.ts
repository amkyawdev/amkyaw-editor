export type PointerKind = 'mouse' | 'touch' | 'pen'

export type GesturePoint = {
  id: number
  x: number
  y: number
  kind: PointerKind
}

export type PinchState = {
  active: boolean
  scale: number
  initialDistance: number
  center: { x: number; y: number }
}

export type PanState = {
  active: boolean
  dx: number
  dy: number
  startX: number
  startY: number
}

export type RotationState = {
  active: boolean
  angle: number
  initialAngle: number
}

export type GestureCallbacks = {
  onTap?: (point: GesturePoint) => void
  onDoubleTap?: (point: GesturePoint) => void
  onLongPress?: (point: GesturePoint) => void
  onPan?: (state: PanState) => void
  onPanStart?: (state: PanState) => void
  onPanEnd?: (state: PanState) => void
  onPinch?: (state: PinchState) => void
  onRotate?: (state: RotationState) => void
}

const DOUBLE_TAP_MS = 280
const LONG_PRESS_MS = 500
const MOVE_TOLERANCE_PX = 8

const distance = (a: GesturePoint, b: GesturePoint): number => Math.hypot(a.x - b.x, a.y - b.y)

const angleBetween = (a: GesturePoint, b: GesturePoint): number =>
  (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI

/**
 * Pointer-event based gesture recognizer. Pointer events are used instead of
 * TouchEvents so the same code path serves mouse, touch and pen, and so
 * `setPointerCapture` keeps drags alive when a finger leaves the element.
 */
export class GestureHandler {
  private element: HTMLElement
  private callbacks: GestureCallbacks
  private active = new Map<number, GesturePoint>()
  private pinch: PinchState = { active: false, scale: 1, initialDistance: 0, center: { x: 0, y: 0 } }
  private rotation: RotationState = { active: false, angle: 0, initialAngle: 0 }
  private pan: PanState = { active: false, dx: 0, dy: 0, startX: 0, startY: 0 }
  private moved = false
  private lastTapAt = 0
  private longPressTimer: ReturnType<typeof setTimeout> | null = null

  constructor(element: HTMLElement, callbacks: GestureCallbacks) {
    this.element = element
    this.callbacks = callbacks
    this.attach()
  }

  private attach(): void {
    this.element.addEventListener('pointerdown', this.onPointerDown)
    this.element.addEventListener('pointermove', this.onPointerMove)
    this.element.addEventListener('pointerup', this.onPointerUp)
    this.element.addEventListener('pointercancel', this.onPointerUp)
    this.element.addEventListener('contextmenu', this.onContextMenu)
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown)
    this.element.removeEventListener('pointermove', this.onPointerMove)
    this.element.removeEventListener('pointerup', this.onPointerUp)
    this.element.removeEventListener('pointercancel', this.onPointerUp)
    this.element.removeEventListener('contextmenu', this.onContextMenu)
    this.clearLongPress()
    this.active.clear()
  }

  private onContextMenu = (event: Event): void => event.preventDefault()

  private clearLongPress(): void {
    if (this.longPressTimer) clearTimeout(this.longPressTimer)
    this.longPressTimer = null
  }

  private pointFrom(event: PointerEvent): GesturePoint {
    const rect = this.element.getBoundingClientRect()
    return {
      id: event.pointerId,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      kind: event.pointerType as PointerKind,
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    const point = this.pointFrom(event)
    this.element.setPointerCapture?.(event.pointerId)
    this.active.set(event.pointerId, point)
    this.moved = false

    if (this.active.size === 1) {
      this.pan = { active: true, dx: 0, dy: 0, startX: point.x, startY: point.y }
      this.callbacks.onPanStart?.(this.pan)
      this.clearLongPress()
      this.longPressTimer = setTimeout(() => {
        if (!this.moved && this.active.size === 1) this.callbacks.onLongPress?.(point)
      }, LONG_PRESS_MS)
    }

    if (this.active.size === 2) {
      const [a, b] = [...this.active.values()]
      this.pinch = {
        active: true,
        scale: 1,
        initialDistance: distance(a, b),
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
      this.rotation = { active: true, angle: 0, initialAngle: angleBetween(a, b) }
      this.clearLongPress()
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    const previous = this.active.get(event.pointerId)
    if (!previous) return
    const point = this.pointFrom(event)
    this.active.set(event.pointerId, point)

    if (Math.abs(point.x - this.pan.startX) > MOVE_TOLERANCE_PX || Math.abs(point.y - this.pan.startY) > MOVE_TOLERANCE_PX) {
      this.moved = true
      this.clearLongPress()
    }

    if (this.active.size === 1) {
      this.pan = {
        ...this.pan,
        active: true,
        dx: point.x - this.pan.startX,
        dy: point.y - this.pan.startY,
      }
      this.callbacks.onPan?.(this.pan)
      return
    }

    if (this.active.size === 2) {
      const [a, b] = [...this.active.values()]
      const currentDistance = distance(a, b)
      this.pinch = {
        ...this.pinch,
        active: true,
        scale: this.pinch.initialDistance > 0 ? currentDistance / this.pinch.initialDistance : 1,
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
      this.rotation = {
        ...this.rotation,
        active: true,
        angle: angleBetween(a, b) - this.rotation.initialAngle,
      }
      this.callbacks.onPinch?.(this.pinch)
      this.callbacks.onRotate?.(this.rotation)
    }
  }

  private onPointerUp = (event: PointerEvent): void => {
    const point = this.active.get(event.pointerId)
    this.active.delete(event.pointerId)
    this.clearLongPress()

    if (this.active.size === 0) {
      this.pan = { ...this.pan, active: false }
      this.callbacks.onPanEnd?.(this.pan)
      this.pinch = { ...this.pinch, active: false }
      this.rotation = { ...this.rotation, active: false }

      if (point && !this.moved) {
        const now = Date.now()
        if (now - this.lastTapAt < DOUBLE_TAP_MS) {
          this.lastTapAt = 0
          this.callbacks.onDoubleTap?.(point)
        } else {
          this.lastTapAt = now
          this.callbacks.onTap?.(point)
        }
      }
    }
  }
}
