import { createId } from '@/lib/id'
import { putAssetBlob, getAssetBlob } from '@/lib/storage'
import type { Asset, AssetKind } from '@/types/project'

const kindFromMime = (mimeType: string): AssetKind => {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('font/')) return 'font'
  return 'image'
}

export type ProbeResult = {
  durationSeconds: number | null
  width: number | null
  height: number | null
}

export const probeMedia = async (file: File, objectUrl: string): Promise<ProbeResult> => {
  const kind = kindFromMime(file.type)

  if (kind === 'image') {
    return new Promise<ProbeResult>((resolve) => {
      const image = new Image()
      image.onload = () =>
        resolve({ durationSeconds: null, width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => resolve({ durationSeconds: null, width: null, height: null })
      image.src = objectUrl
    })
  }

  if (kind === 'audio') {
    return new Promise<ProbeResult>((resolve) => {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.onloadedmetadata = () =>
        resolve({
          durationSeconds: Number.isFinite(audio.duration) ? audio.duration : null,
          width: null,
          height: null,
        })
      audio.onerror = () => resolve({ durationSeconds: null, width: null, height: null })
      audio.src = objectUrl
    })
  }

  return new Promise<ProbeResult>((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () =>
      resolve({
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      })
    video.onerror = () => resolve({ durationSeconds: null, width: null, height: null })
    video.src = objectUrl
  })
}

export const importAsset = async (file: File, persist = true): Promise<Asset> => {
  const objectUrl = URL.createObjectURL(file)
  const probe = await probeMedia(file, objectUrl)
  const asset: Asset = {
    id: createId('asset'),
    name: file.name,
    kind: kindFromMime(file.type),
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    durationSeconds: probe.durationSeconds,
    width: probe.width,
    height: probe.height,
    objectUrl,
    persisted: persist,
    createdAt: Date.now(),
  }

  if (persist) {
    try {
      await putAssetBlob({
        id: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        blob: file,
        createdAt: asset.createdAt,
      })
    } catch {
      asset.persisted = false
    }
  }

  return asset
}

/** Rebuilds an object URL after a reload; returns null when the blob is gone. */
export const restoreAssetUrl = async (asset: Asset): Promise<string | null> => {
  const blob = await getAssetBlob(asset.id)
  return blob ? URL.createObjectURL(blob) : null
}

export const revokeAssetUrl = (asset: Asset): void => {
  if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl)
}

/** Accept string for file inputs; `capture` enables the camera on mobile. */
export const mediaAccept = (kind: AssetKind | 'all' = 'all'): string => {
  switch (kind) {
    case 'video':
      return 'video/*'
    case 'audio':
      return 'audio/*'
    case 'image':
      return 'image/*'
    default:
      return 'video/*,audio/*,image/*'
  }
}

export const pickFiles = (options: { accept?: string; multiple?: boolean; capture?: boolean } = {}) =>
  new Promise<File[]>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = options.accept ?? mediaAccept('all')
    input.multiple = options.multiple ?? false
    if (options.capture) input.capture = 'environment'
    input.style.display = 'none'
    input.onchange = () => {
      resolve(input.files ? [...input.files] : [])
      input.remove()
    }
    document.body.appendChild(input)
    input.click()
  })

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Uses the native share sheet when available (iOS/Android), else downloads. */
export const saveBlob = async (blob: Blob, filename: string, title = 'Export'): Promise<'shared' | 'downloaded'> => {
  const file = new File([blob], filename, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title })
      return 'shared'
    } catch {
      // User dismissed the sheet; fall through to download.
    }
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}
