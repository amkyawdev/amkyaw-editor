export type Vec2 = { x: number; y: number }
export type Vec3 = { x: number; y: number; z: number }
export type Size = { width: number; height: number }
export type Rect = { x: number; y: number; width: number; height: number }

/** RGBA in 0..1 space so values can be fed straight to WebGL uniforms. */
export type RGBA = { r: number; g: number; b: number; a: number }

export type Transform = {
  position: Vec2
  scale: Vec2
  rotation: number
  anchor: Vec2
  skew: Vec2
}

export const identityTransform = (): Transform => ({
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  rotation: 0,
  anchor: { x: 0.5, y: 0.5 },
  skew: { x: 0, y: 0 },
})

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const lerpVec2 = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
})

export const vec2Length = (v: Vec2): number => Math.hypot(v.x, v.y)

export const vec2Sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })

export const vec2Add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })

export const vec2Scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s })

export const vec2Distance = (a: Vec2, b: Vec2): number => vec2Length(vec2Sub(a, b))

export const roundTo = (value: number, decimals = 3): number => {
  if (!Number.isFinite(value)) return value
  // Shifting through a string avoids the 1.005 * 100 === 100.49999… error.
  const shifted = Number(`${value}e${decimals}`)
  return Number(`${Math.round(shifted)}e-${decimals}`)
}

export const DEG_TO_RAD = Math.PI / 180
export const RAD_TO_DEG = 180 / Math.PI

/** Average of two points — used by pinch gestures for the pivot location. */
export const midpoint = (a: Vec2, b: Vec2): Vec2 => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})
