import type { BlendMode, Layer } from '@/types/layer'
import type { ResolvedLayer } from './scene-graph'
import type { RGBA, Rect, Size } from '@/lib/math'

/** Maps blend modes onto WebGL blend equations, falling back to alpha blending. */
export type BlendEquation = {
  src: number
  dst: number
  mode: 'add' | 'subtract' | 'reverse-subtract'
}

export const blendEquations: Record<BlendMode, BlendEquation> = {
  normal: { src: 0x0302, dst: 0x0303, mode: 'add' }, // SRC_ALPHA, ONE_MINUS_SRC_ALPHA
  add: { src: 0x0001, dst: 0x0001, mode: 'add' }, // ONE, ONE
  screen: { src: 0x0001, dst: 0x0303, mode: 'add' }, // ONE, ONE_MINUS_SRC_ALPHA
  multiply: { src: 0x0306, dst: 0x0303, mode: 'add' }, // DST_COLOR, ONE_MINUS_SRC_ALPHA
  overlay: { src: 0x0302, dst: 0x0303, mode: 'add' },
  darken: { src: 0x0302, dst: 0x0303, mode: 'add' },
  lighten: { src: 0x0302, dst: 0x0303, mode: 'add' },
}

export type CompositeLayer = {
  resolved: ResolvedLayer
  rect: Rect
  blend: BlendMode
}

export const computeFitRect = (source: Size, target: Size, mode: 'fit' | 'fill' | 'stretch' = 'fit'): Rect => {
  if (mode === 'stretch') return { x: 0, y: 0, width: target.width, height: target.height }
  const scaleX = target.width / source.width
  const scaleY = target.height / source.height
  const scale = mode === 'fit' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
  const width = source.width * scale
  const height = source.height * scale
  return {
    x: (target.width - width) / 2,
    y: (target.height - height) / 2,
    width,
    height,
  }
}

export const applyTransformToRect = (
  rect: Rect,
  transform: ResolvedLayer['transform'],
  target: Size,
): Rect => {
  const scaleX = transform.scale.x
  const scaleY = transform.scale.y
  const width = rect.width * scaleX
  const height = rect.height * scaleY
  const centerX = target.width / 2 + transform.position.x
  const centerY = target.height / 2 + transform.position.y
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
}

/** Layers that fully occlude everything beneath them stop the composite loop. */
export const isOpaque = (layer: Layer): boolean =>
  layer.opacity >= 1 && layer.mask === 'none' && layer.type !== 'audio'

export const buildCompositeList = (
  resolved: ResolvedLayer[],
  target: Size,
): CompositeLayer[] =>
  resolved
    .filter((item) => item.active && item.layer.type !== 'audio')
    .map((item) => ({
      resolved: item,
      rect: applyTransformToRect(
        { x: 0, y: 0, width: target.width, height: target.height },
        item.transform,
        target,
      ),
      blend: item.layer.blendMode,
    }))

export const clearColorFor = (background: RGBA): RGBA =>
  background.a >= 1 ? background : { ...background, a: background.a }
