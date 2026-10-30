import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useUiStore } from '@/store/uiStore'
import { exportPipeline, type ExportProgress } from '@/core/export-pipeline'
import { FFmpegManager } from '@/core/ffmpeg-manager'
import { wakeLock } from '@/mobile/wake-lock'
import { haptics } from '@/mobile/haptics'
import { ASPECT_RATIOS, type ExportFormat, type ProjectAspect } from '@/types/project'
import { formatBytes } from '@/lib/time'

const FORMATS: ExportFormat[] = ['mp4', 'webm', 'gif', 'webp', 'png-sequence']
const QUALITIES = ['low', 'medium', 'high', 'ultra'] as const

const PRESET_SIZES: Array<{ label: string; width: number; height: number }> = [
  { label: '1080p', width: 1920, height: 1080 },
  { label: '720p', width: 1280, height: 720 },
  { label: 'Vertical 1080', width: 1080, height: 1920 },
  { label: 'Square 1080', width: 1080, height: 1080 },
]

/** Export controls shared by desktop sidebar and the mobile export sheet. */
export const ExportPanel = () => {
  const project = useProjectStore((state) => state.project)
  const setResolution = useProjectStore((state) => state.setResolution)
  const setProject = useProjectStore((state) => state.setProject)
  const pushToast = useUiStore((state) => state.pushToast)

  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [busy, setBusy] = useState(false)

  const settings = project.exportSettings
  const multithreaded = FFmpegManager.isMultithreadCapable

  const updateSettings = (patch: Partial<typeof settings>) => {
    setProject({
      ...project,
      exportSettings: { ...settings, ...patch },
      updatedAt: Date.now(),
    })
  }

  const onAspect = (aspect: ProjectAspect) => {
    if (aspect === 'custom') return
    const ratio = ASPECT_RATIOS[aspect]
    const height = project.resolution.height
    setResolution(Math.round(height * ratio), height)
  }

  const onExport = async () => {
    if (busy) return
    setBusy(true)
    haptics.trigger('medium')
    await wakeLock.acquire()
    try {
      const result = await exportPipeline.run(project, setProgress)
      haptics.trigger('success')
      pushToast(
        result.savedAs === 'shared' ? `Shared ${result.filename}` : `Saved ${result.filename} (${formatBytes(result.blob.size)})`,
        'success',
      )
    } catch (error) {
      haptics.trigger('error')
      pushToast(error instanceof Error ? error.message : 'Export failed', 'error')
    } finally {
      await wakeLock.release()
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="label">Format</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              className={`chip ${settings.format === format ? 'border-accent text-accent' : ''}`}
              onClick={() => updateSettings({ format })}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Resolution</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PRESET_SIZES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`chip ${
                settings.width === preset.width && settings.height === preset.height ? 'border-accent text-accent' : ''
              }`}
              onClick={() => setResolution(preset.width, preset.height)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(ASPECT_RATIOS) as Array<Exclude<ProjectAspect, 'custom'>>).map((aspect) => (
            <button key={aspect} type="button" className="chip" onClick={() => onAspect(aspect)}>
              {aspect}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Quality</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {QUALITIES.map((quality) => (
            <button
              key={quality}
              type="button"
              className={`chip ${settings.quality === quality ? 'border-accent text-accent' : ''}`}
              onClick={() => updateSettings({ quality })}
            >
              {quality}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between rounded-lg border border-edge bg-panelAlt px-3 py-2 text-sm">
        <span>Include audio</span>
        <input
          type="checkbox"
          checked={settings.includeAudio}
          onChange={(event) => updateSettings({ includeAudio: event.target.checked })}
        />
      </label>

      <label className="flex items-center justify-between rounded-lg border border-edge bg-panelAlt px-3 py-2 text-sm">
        <span>Transparent background</span>
        <input
          type="checkbox"
          checked={settings.transparent}
          onChange={(event) => updateSettings({ transparent: event.target.checked })}
        />
      </label>

      <p className="rounded-lg border border-edge bg-panelAlt px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        {multithreaded
          ? 'SharedArrayBuffer detected — multi-threaded FFmpeg core available.'
          : 'Single-threaded FFmpeg core. Cross-origin isolation headers are required for multi-threaded encoding.'}
      </p>

      {progress ? (
        <div className="rounded-lg border border-edge bg-panelAlt px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">{progress.message}</span>
            <span className="tabular-nums text-slate-400">{Math.round(progress.ratio * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-edge">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress.ratio * 100}%` }} />
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={onExport}>
          {busy ? 'Exporting…' : 'Export'}
        </button>
        {busy ? (
          <button type="button" className="btn" onClick={() => exportPipeline.cancel()}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  )
}
