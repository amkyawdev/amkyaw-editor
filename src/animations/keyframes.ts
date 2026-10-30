import type { EasingName, Keyframe, KeyframeValue, Track } from '@/types/animation'
import { applyEasing } from './easing'
import { lerp, lerpVec2 } from '@/lib/math'

export type KeyframeInput<T extends KeyframeValue> = {
  id: string
  frame: number
  value: T
  easing: EasingName
}

/** Binary search for the last keyframe at or before `frame`. */
export const findKeyframeIndex = <T extends KeyframeValue>(
  keyframes: Keyframe<T>[],
  frame: number,
): number => {
  let low = 0
  let high = keyframes.length - 1
  let result = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (keyframes[mid].frame <= frame) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}

const isNumeric = (value: KeyframeValue): value is number => typeof value === 'number'

const interpolate = (a: KeyframeValue, b: KeyframeValue, t: number): KeyframeValue => {
  if (isNumeric(a) && isNumeric(b)) return lerp(a, b, t)
  if (typeof a === 'object' && typeof b === 'object') {
    if ('x' in a && 'x' in b) return lerpVec2(a as never, b as never, t)
    if ('r' in a && 'r' in b) {
      const from = a as { r: number; g: number; b: number; a: number }
      const to = b as { r: number; g: number; b: number; a: number }
      return {
        r: lerp(from.r, to.r, t),
        g: lerp(from.g, to.g, t),
        b: lerp(from.b, to.b, t),
        a: lerp(from.a, to.a, t),
      }
    }
  }
  return t < 1 ? a : b
}

export const evaluateKeyframes = <T extends KeyframeValue>(
  keyframes: Keyframe<T>[],
  frame: number,
): T | null => {
  if (keyframes.length === 0) return null
  const index = findKeyframeIndex(keyframes, frame)
  if (index < 0) return keyframes[0].value
  if (index >= keyframes.length - 1) return keyframes[keyframes.length - 1].value

  const from = keyframes[index]
  const to = keyframes[index + 1]
  const span = to.frame - from.frame
  if (span <= 0) return to.value

  const raw = (frame - from.frame) / span
  // Easing is authored on the outgoing keyframe (the segment it starts).
  const eased = applyEasing(from.easing, raw)
  return interpolate(from.value, to.value, eased) as T
}

export const evaluateTrack = (track: Track, frame: number): KeyframeValue | null => {
  if (!track.enabled || track.muted) return null
  return evaluateKeyframes(track.keyframes as Keyframe<KeyframeValue>[], frame)
}

export const sortKeyframes = <T extends KeyframeValue>(keyframes: Keyframe<T>[]): Keyframe<T>[] =>
  [...keyframes].sort((a, b) => a.frame - b.frame)

export const upsertKeyframe = <T extends KeyframeValue>(
  keyframes: Keyframe<T>[],
  next: Keyframe<T>,
): Keyframe<T>[] => {
  const filtered = keyframes.filter((kf) => kf.frame !== next.frame)
  return sortKeyframes([...filtered, next])
}

export const removeKeyframeAt = <T extends KeyframeValue>(
  keyframes: Keyframe<T>[],
  frame: number,
): Keyframe<T>[] => keyframes.filter((kf) => kf.frame !== frame)
