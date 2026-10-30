import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { ExportFormat, ExportSettings } from '@/types/project'
import { QUALITY_BITRATE_MULTIPLIER } from '@/types/project'

export type FfmpegProgress = {
  phase: 'loading' | 'encoding' | 'finalizing' | 'done'
  ratio: number
  message: string
}

export type EncodeInput = {
  /** Raw frame bytes (RGBA) emitted by the render worker, oldest frame first. */
  frames: Uint8Array[]
  width: number
  height: number
  fps: number
  settings: ExportSettings
  audio?: { data: Uint8Array; mimeType: string } | null
  onProgress?: (progress: FfmpegProgress) => void
}

const CORE_VERSION = '0.12.6'
const BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

const codecArgsFor = (format: ExportFormat, settings: ExportSettings): string[] => {
  const bitrate = `${Math.round(settings.bitrateKbps * QUALITY_BITRATE_MULTIPLIER[settings.quality])}k`
  switch (format) {
    case 'webm':
      return ['-c:v', 'libvpx-vp9', '-b:v', bitrate, '-pix_fmt', settings.transparent ? 'yuva420p' : 'yuv420p']
    case 'gif':
      return ['-vf', `fps=${settings.fps},split[a][b];[a]palettegen[p];[b][p]paletteuse`, '-loop', '0']
    case 'webp':
      return ['-c:v', 'libwebp', '-lossless', '0', '-q:v', '80', '-loop', '0']
    case 'png-sequence':
      return ['-c:v', 'png']
    case 'mp4':
    default:
      return ['-c:v', 'libx264', '-preset', 'medium', '-b:v', bitrate, '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
  }
}

export class FFmpegManager {
  private ffmpeg: FFmpeg | null = null
  private loaded = false
  private loadPromise: Promise<void> | null = null

  get isLoaded(): boolean {
    return this.loaded
  }

  static get isMultithreadCapable(): boolean {
    return typeof SharedArrayBuffer !== 'undefined' && globalThis.crossOriginIsolated === true
  }

  async load(onProgress?: (progress: FfmpegProgress) => void): Promise<void> {
    if (this.loaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = (async () => {
      onProgress?.({ phase: 'loading', ratio: 0, message: 'Downloading FFmpeg core…' })
      const ffmpeg = new FFmpeg()
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      ])
      await ffmpeg.load({ coreURL, wasmURL })
      ffmpeg.on('progress', ({ progress }) => {
        onProgress?.({
          phase: 'encoding',
          ratio: Number.isFinite(progress) ? progress : 0,
          message: `Encoding ${Math.round((progress || 0) * 100)}%`,
        })
      })
      this.ffmpeg = ffmpeg
      this.loaded = true
      onProgress?.({ phase: 'loading', ratio: 1, message: 'FFmpeg ready' })
    })()

    return this.loadPromise
  }

  private extensionFor(format: ExportFormat): string {
    switch (format) {
      case 'png-sequence':
        return 'png'
      case 'webp':
        return 'webp'
      case 'gif':
        return 'gif'
      case 'webm':
        return 'webm'
      default:
        return 'mp4'
    }
  }

  async encode(input: EncodeInput): Promise<Blob> {
    const { frames, width, height, fps, settings, audio, onProgress } = input
    if (!this.loaded || !this.ffmpeg) await this.load(onProgress)
    const ffmpeg = this.ffmpeg
    if (!ffmpeg) throw new Error('FFmpeg failed to load')

    onProgress?.({ phase: 'encoding', ratio: 0, message: 'Writing frames…' })
    for (let i = 0; i < frames.length; i += 1) {
      await ffmpeg.writeFile(`frame_${String(i).padStart(5, '0')}.rgba`, frames[i])
    }

    const extension = this.extensionFor(settings.format)
    const outputName = `output.${extension}`

    const args: string[] = [
      '-f', 'rawvideo',
      '-pixel_format', 'rgba',
      '-video_size', `${width}x${height}`,
      '-framerate', String(fps),
      '-i', 'frame_%05d.rgba',
    ]

    if (audio && settings.includeAudio) {
      const audioName = audio.mimeType.includes('wav') ? 'audio.wav' : 'audio.bin'
      await ffmpeg.writeFile(audioName, audio.data)
      args.push('-i', audioName)
    }

    args.push(...codecArgsFor(settings.format, settings))
    if (settings.format === 'mp4' || settings.format === 'webm') {
      args.push('-r', String(fps))
    }
    args.push(outputName)

    await ffmpeg.exec(args)
    onProgress?.({ phase: 'finalizing', ratio: 0.95, message: 'Packaging output…' })

    const data = await ffmpeg.readFile(outputName)
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
    const mime =
      settings.format === 'gif'
        ? 'image/gif'
        : settings.format === 'webp'
          ? 'image/webp'
          : settings.format === 'png-sequence'
            ? 'image/png'
            : settings.format === 'webm'
              ? 'video/webm'
              : 'video/mp4'

    onProgress?.({ phase: 'done', ratio: 1, message: 'Export complete' })
    return new Blob([bytes as unknown as BlobPart], { type: mime })
  }

  async loadFileFromUrl(url: string, name: string): Promise<void> {
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded')
    await this.ffmpeg.writeFile(name, await fetchFile(url))
  }

  terminate(): void {
    this.ffmpeg?.terminate()
    this.ffmpeg = null
    this.loaded = false
    this.loadPromise = null
  }
}

export const ffmpegManager = new FFmpegManager()
