export const FPS_PRESETS = [24, 25, 30, 50, 60] as const
export type FpsPreset = (typeof FPS_PRESETS)[number]

/** Frames are the canonical unit; seconds are derived at the edges. */
export const secondsToFrames = (seconds: number, fps: number): number =>
  Math.round(seconds * fps)

export const framesToSeconds = (frames: number, fps: number): number => frames / fps

export const framesToTimecode = (frames: number, fps: number): string => {
  const safe = Math.max(0, Math.round(frames))
  const totalSeconds = Math.floor(safe / fps)
  const ff = safe % fps
  const ss = totalSeconds % 60
  const mm = Math.floor(totalSeconds / 60) % 60
  const hh = Math.floor(totalSeconds / 3600)
  const pad = (n: number, size = 2) => String(n).padStart(size, '0')
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`
}

export const timecodeToFrames = (timecode: string, fps: number): number => {
  const parts = timecode.split(':').map((p) => Number.parseInt(p, 10))
  if (parts.some((n) => Number.isNaN(n))) return 0
  const [hh = 0, mm = 0, ss = 0, ff = 0] = parts
  return ((hh * 60 + mm) * 60 + ss) * fps + ff
}

export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** i
  // Whole values read better without a decimal ("5 MB", not "5.0 MB").
  const rounded = value >= 10 || i === 0 ? Math.round(value) : Number(value.toFixed(1))
  return `${rounded} ${units[i]}`
}
