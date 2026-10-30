import type { EasingName } from '@/types/animation'

export type EasingFn = (t: number) => number

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

export const easings: Record<EasingName, EasingFn> = {
  linear: (t) => clamp01(t),
  step: () => 0,
  easeInQuad: (t) => {
    const x = clamp01(t)
    return x * x
  },
  easeOutQuad: (t) => {
    const x = clamp01(t)
    return 1 - (1 - x) * (1 - x)
  },
  easeInOutQuad: (t) => {
    const x = clamp01(t)
    return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
  },
  easeInCubic: (t) => clamp01(t) ** 3,
  easeOutCubic: (t) => 1 - (1 - clamp01(t)) ** 3,
  easeInOutCubic: (t) => {
    const x = clamp01(t)
    return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2
  },
  easeInOutSine: (t) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    const x = clamp01(t)
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
  },
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3
    const x = clamp01(t)
    if (x === 0 || x === 1) return x
    return 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625
    const d1 = 2.75
    const x = clamp01(t)
    if (x < 1 / d1) return n1 * x * x
    if (x < 2 / d1) {
      const y = x - 1.5 / d1
      return n1 * y * y + 0.75
    }
    if (x < 2.5 / d1) {
      const y = x - 2.25 / d1
      return n1 * y * y + 0.9375
    }
    const y = x - 2.625 / d1
    return n1 * y * y + 0.984375
  },
}

export const easingNames = Object.keys(easings) as EasingName[]

export const applyEasing = (name: EasingName, t: number): number =>
  (easings[name] ?? easings.linear)(t)

/** Cubic-bezier evaluator used by custom curves; x1/y1/x2/y2 are control points. */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number): EasingFn => {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1
  const c = (a1: number) => 3 * a1
  const calc = (t: number, a1: number, a2: number) =>
    ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t
  const slope = (t: number, a1: number, a2: number) =>
    3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1)

  return (t: number) => {
    const x = clamp01(t)
    if (x === 0 || x === 1) return x
    let guess = x
    for (let i = 0; i < 8; i += 1) {
      const current = calc(guess, x1, x2) - x
      const derivative = slope(guess, x1, x2)
      if (Math.abs(current) < 1e-5) break
      if (Math.abs(derivative) < 1e-6) break
      guess -= current / derivative
    }
    return calc(guess, y1, y2)
  }
}
