import Dexie, { type Table } from 'dexie'
import type { Project } from '@/types/project'

export type ProjectRecord = {
  id: string
  name: string
  updatedAt: number
  data: Project
}

export type AssetBlobRecord = {
  id: string
  name: string
  mimeType: string
  blob: Blob
  createdAt: number
}

export type ThumbnailRecord = {
  id: string
  assetId: string
  frame: number
  width: number
  height: number
  blob: Blob
}

export class AmkyawDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>
  assets!: Table<AssetBlobRecord, string>
  thumbnails!: Table<ThumbnailRecord, string>

  constructor() {
    super('amkyaw-editor')
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      assets: 'id, name, createdAt',
      thumbnails: 'id, assetId, frame',
    })
  }
}

export const db = new AmkyawDatabase()

export const saveProject = async (project: Project): Promise<void> => {
  await db.projects.put({
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    data: project,
  })
}

export const loadProject = async (id: string): Promise<Project | null> => {
  const record = await db.projects.get(id)
  return record?.data ?? null
}

export const listProjects = async (): Promise<ProjectRecord[]> =>
  db.projects.orderBy('updatedAt').reverse().toArray()

export const deleteProject = async (id: string): Promise<void> => {
  await db.projects.delete(id)
}

export const putAssetBlob = async (record: AssetBlobRecord): Promise<void> => {
  await db.assets.put(record)
}

export const getAssetBlob = async (id: string): Promise<Blob | null> => {
  const record = await db.assets.get(id)
  return record?.blob ?? null
}

export const deleteAssetBlob = async (id: string): Promise<void> => {
  await db.assets.delete(id)
}

export const clearThumbnailsForAsset = async (assetId: string): Promise<void> => {
  await db.thumbnails.where('assetId').equals(assetId).delete()
}

export const storageEstimate = async (): Promise<{ usage: number; quota: number }> => {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 }
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}

/** Serializes a project for export/download, stripping non-portable object URLs. */
export const serializeProject = (project: Project): string =>
  JSON.stringify(
    {
      ...project,
      assets: project.assets.map((asset) => ({ ...asset, objectUrl: null })),
    },
    null,
    2,
  )

export const deserializeProject = (raw: string): Project => {
  const parsed = JSON.parse(raw) as Project
  if (typeof parsed?.id !== 'string' || !Array.isArray(parsed.layers)) {
    throw new Error('Invalid project file: missing id or layers array.')
  }
  return parsed
}
