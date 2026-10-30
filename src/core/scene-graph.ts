import type { Layer } from '@/types/layer'
import type { EffectInstance } from '@/types/effect'
import type { Track } from '@/types/animation'
import { evaluateKeyframes } from '@/animations/keyframes'
import { identityTransform, type Transform } from '@/lib/math'

export type ResolvedLayer = {
  layer: Layer
  transform: Transform
  opacity: number
  blur: number
  active: boolean
  /** Source-relative time in seconds, honoring trim + playback rate. */
  sourceTime: number
  effects: EffectInstance[]
}

export type SceneNode = {
  layer: Layer
  children: SceneNode[]
  parent: SceneNode | null
}

const buildTree = (layers: Layer[]): SceneNode[] => {
  const nodes = new Map<string, SceneNode>()
  for (const layer of layers) nodes.set(layer.id, { layer, children: [], parent: null })

  // Roots are collected in input order, not Map order, so a child listed before
  // its parent cannot reorder unrelated siblings.
  const roots: SceneNode[] = []
  for (const layer of layers) {
    const node = nodes.get(layer.id)
    if (!node) continue
    const parent = layer.parentId ? nodes.get(layer.parentId) : undefined
    if (parent) {
      node.parent = parent
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/** Flattened depth-first order; later entries paint on top. */
export const flattenScene = (layers: Layer[]): Layer[] => {
  const out: Layer[] = []
  const visit = (node: SceneNode) => {
    out.push(node.layer)
    for (const child of node.children) visit(child)
  }
  for (const root of buildTree(layers)) visit(root)
  return out
}

export const buildSceneGraph = (layers: Layer[]): SceneNode[] => buildTree(layers)

const resolveProperty = (
  tracks: Track[],
  layerId: string,
  property: Track['property'],
  frame: number,
  fallback: number,
): number => {
  const track = tracks.find(
    (candidate) =>
      candidate.layerId === layerId && candidate.property === property && candidate.enabled,
  )
  if (!track) return fallback
  const value = evaluateKeyframes(track.keyframes as never, frame)
  return typeof value === 'number' ? value : fallback
}

export type ResolveOptions = {
  frame: number
  tracks: Track[]
  effects: EffectInstance[]
  soloLayerId?: string | null
}

export const resolveLayer = (layer: Layer, options: ResolveOptions): ResolvedLayer => {
  const { frame, tracks, effects } = options
  const active = frame >= layer.startFrame && frame <= layer.endFrame && layer.visible
  const soloActive = options.soloLayerId ? layer.id === options.soloLayerId : true

  const transform: Transform = {
    ...identityTransform(),
    position: {
      x: resolveProperty(tracks, layer.id, 'position.x', frame, layer.transform.position.x),
      y: resolveProperty(tracks, layer.id, 'position.y', frame, layer.transform.position.y),
    },
    scale: {
      x: resolveProperty(tracks, layer.id, 'scale.x', frame, layer.transform.scale.x),
      y: resolveProperty(tracks, layer.id, 'scale.y', frame, layer.transform.scale.y),
    },
    rotation: resolveProperty(tracks, layer.id, 'rotation', frame, layer.transform.rotation),
  }

  const opacity = resolveProperty(tracks, layer.id, 'opacity', frame, layer.opacity)
  const blur = resolveProperty(tracks, layer.id, 'blur', frame, 0)

  const localFrame = Math.max(0, frame - layer.startFrame)
  const elapsed = localFrame / Math.max(1, layer.endFrame - layer.startFrame)
  const trimIn = layer.source?.trimIn ?? 0
  const rate = layer.source?.playbackRate ?? 1
  const sourceTime = layer.type === 'video' || layer.type === 'audio' ? trimIn + elapsed * rate : 0

  return {
    layer,
    transform,
    opacity,
    blur,
    active: active && soloActive,
    sourceTime,
    effects: effects.filter((effect) => effect.layerId === layer.id && effect.enabled),
  }
}

export const resolveScene = (layers: Layer[], options: ResolveOptions): ResolvedLayer[] =>
  flattenScene(layers).map((layer) => resolveLayer(layer, options))

export const hitTest = (resolved: ResolvedLayer[], point: { x: number; y: number }): ResolvedLayer | null => {
  for (let i = resolved.length - 1; i >= 0; i -= 1) {
    const item = resolved[i]
    if (!item.active) continue
    const { position, scale } = item.transform
    const halfWidth = (scale.x * 100) / 2
    const halfHeight = (scale.y * 100) / 2
    if (
      point.x >= position.x - halfWidth &&
      point.x <= position.x + halfWidth &&
      point.y >= position.y - halfHeight &&
      point.y <= position.y + halfHeight
    ) {
      return item
    }
  }
  return null
}
