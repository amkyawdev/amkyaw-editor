import { useCallback, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useUiStore } from '@/store/uiStore'
import { useEditorStore } from '@/store/editorStore'
import { importAsset, mediaAccept, pickFiles, revokeAssetUrl } from '@/mobile/file-system'
import { formatBytes, formatDuration } from '@/lib/time'
import type { Asset } from '@/types/project'

/**
 * Media bin. Assets are stored as blobs in IndexedDB and referenced from the
 * project by id, so reloading restores them without re-importing.
 */
export const AssetPanel = () => {
  const assets = useProjectStore((state) => state.project.assets)
  const addAsset = useProjectStore((state) => state.addAsset)
  const removeAsset = useProjectStore((state) => state.removeAsset)
  const updateLayer = useProjectStore((state) => state.updateLayer)
  const layers = useProjectStore((state) => state.project.layers)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const pushToast = useUiStore((state) => state.pushToast)
  const [busy, setBusy] = useState(false)

  const onImport = useCallback(async () => {
    setBusy(true)
    try {
      const files = await pickFiles({ accept: mediaAccept('all'), multiple: true })
      for (const file of files) {
        const asset = await importAsset(file)
        addAsset(asset)
      }
      if (files.length > 0) pushToast(`Imported ${files.length} file(s)`, 'success')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Import failed', 'error')
    } finally {
      setBusy(false)
    }
  }, [addAsset, pushToast])

  const attachToLayer = (asset: Asset) => {
    const layer = layers.find((candidate) => candidate.id === selectedLayerId)
    if (!layer) {
      pushToast('Select a layer first, then tap an asset to attach it.', 'info')
      return
    }
    updateLayer(layer.id, {
      source: {
        assetId: asset.id,
        url: asset.objectUrl,
        trimIn: 0,
        trimOut: asset.durationSeconds,
        playbackRate: 1,
        loop: false,
      },
    })
    pushToast(`Attached ${asset.name} to ${layer.name}`, 'success')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="label">Media ({assets.length})</span>
        <button type="button" className="chip" disabled={busy} onClick={onImport}>
          {busy ? 'Importing…' : '+ Import'}
        </button>
      </div>

      {assets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-edge px-3 py-6 text-center text-xs text-slate-500">
          No media yet. Import video, audio or images from your device.
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {assets.map((asset) => (
          <li key={asset.id} className="flex items-center gap-2 rounded-lg border border-edge bg-panelAlt p-2">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => attachToLayer(asset)}>
              <p className="truncate text-sm">{asset.name}</p>
              <p className="text-[10px] text-slate-500">
                {asset.kind} · {formatBytes(asset.size)}
                {asset.durationSeconds ? ` · ${formatDuration(asset.durationSeconds)}` : ''}
                {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
              </p>
            </button>
            <button
              type="button"
              className="touch-target text-xs text-danger"
              aria-label={`Remove ${asset.name}`}
              onClick={() => {
                revokeAssetUrl(asset)
                removeAsset(asset.id)
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
