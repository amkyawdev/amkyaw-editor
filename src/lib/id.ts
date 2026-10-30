import { nanoid } from 'nanoid'

export type EntityKind = 'layer' | 'track' | 'keyframe' | 'effect' | 'project' | 'clip' | 'asset'

const PREFIX: Record<EntityKind, string> = {
  layer: 'lyr',
  track: 'trk',
  keyframe: 'kf',
  effect: 'fx',
  project: 'prj',
  clip: 'clp',
  asset: 'ast',
}

export const createId = (kind: EntityKind = 'project'): string =>
  `${PREFIX[kind]}_${nanoid(10)}`

export const createStableId = (kind: EntityKind, seed: string | number): string =>
  `${PREFIX[kind]}_${String(seed).replace(/[^a-zA-Z0-9_-]/g, '')}`
