/// <reference lib="webworker" />
/**
 * FFmpeg.wasm export worker.
 *
 * Runs the transcode off the main thread so the editor stays responsive during
 * export. The core is fetched from a CDN at runtime (loaded lazily on first
 * export) and cached by the service worker afterwards.
 *
 * Protocol (main -> worker):
 *   { type: 'load' }
 *   { type: 'encode', id, frames: [ArrayBuffer], width, height, fps, settings, audio? }
 *   { type: 'terminate' }
 */

const CORE_VERSION = '0.12.6'
const BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`
const FFMPEG_URL = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'
const UTIL_URL = 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js'

let ffmpeg = null
let loaded = false
let loadPromise = null

const load = async () => {
  if (loaded) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    self.postMessage({ type: 'progress', phase: 'loading', ratio: 0, message: 'Downloading FFmpeg core…' })
    const { FFmpeg } = await import(/* @vite-ignore */ FFMPEG_URL)
    const { toBlobURL: utilToBlobURL } = await import(/* @vite-ignore */ UTIL_URL)

    const instance = new FFmpeg()
    const [coreURL, wasmURL] = await Promise.all([
      utilToBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
      utilToBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    ])
    await instance.load({ coreURL, wasmURL })

    instance.on('progress', ({ progress }) => {
      self.postMessage({
        type: 'progress',
        phase: 'encoding',
        ratio: Number.isFinite(progress) ? progress : 0,
        message: `Encoding ${Math.round((progress || 0) * 100)}%`,
      })
    })

    ffmpeg = instance
    loaded = true
    self.postMessage({ type: 'loaded' })
  })()

  return loadPromise
}

const codecArgs = (format, settings) => {
  const multiplier = { low: 0.35, medium: 0.6, high: 1, ultra: 1.6 }[settings.quality] || 1
  const bitrate = `${Math.round(settings.bitrateKbps * multiplier)}k`
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

const extensionFor = (format) => {
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

const encode = async (message) => {
  const { id, frames, width, height, fps, settings, audio } = message
  await load()
  if (!ffmpeg) throw new Error('FFmpeg failed to load')

  const names = []
  for (let i = 0; i < frames.length; i += 1) {
    const name = `frame_${String(i).padStart(5, '0')}.rgba`
    await ffmpeg.writeFile(name, new Uint8Array(frames[i]))
    names.push(name)
  }

  const extension = extensionFor(settings.format)
  const outputName = `output.${extension}`

  const args = [
    '-f',
    'rawvideo',
    '-pixel_format',
    'rgba',
    '-video_size',
    `${width}x${height}`,
    '-framerate',
    String(fps),
    '-i',
    'frame_%05d.rgba',
  ]

  if (audio && settings.includeAudio) {
    const audioName = audio.mimeType && audio.mimeType.includes('wav') ? 'audio.wav' : 'audio.bin'
    await ffmpeg.writeFile(audioName, new Uint8Array(audio.data))
    args.push('-i', audioName)
  }

  args.push(...codecArgs(settings.format, settings))
  if (settings.format === 'mp4' || settings.format === 'webm') args.push('-r', String(fps))
  args.push(outputName)

  await ffmpeg.exec(args)
  self.postMessage({ type: 'progress', phase: 'finalizing', ratio: 0.95, message: 'Packaging output…' })

  const data = await ffmpeg.readFile(outputName)
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)

  for (const name of names) {
    try {
      await ffmpeg.deleteFile(name)
    } catch {
      // Best effort cleanup; the FS is discarded on terminate anyway.
    }
  }

  self.postMessage({ type: 'encoded', id, buffer, extension }, [buffer])
}

self.onmessage = async (event) => {
  const message = event.data
  try {
    switch (message.type) {
      case 'load':
        await load()
        break
      case 'encode':
        await encode(message)
        break
      case 'terminate':
        if (ffmpeg) ffmpeg.terminate()
        ffmpeg = null
        loaded = false
        loadPromise = null
        self.postMessage({ type: 'terminated' })
        break
      default:
        break
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: message && message.id != null ? message.id : null,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
