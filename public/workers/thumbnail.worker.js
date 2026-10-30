/// <reference lib="webworker" />
/**
 * Timeline thumbnail worker. Decodes a video/audio element off-thread (via
 * ImageBitmap) and paints evenly spaced thumbs across a strip so the timeline
 * does not stall while scrolling.
 *
 * Protocol (main -> worker):
 *   { type: 'generate', id, url, count, width, height, durationSeconds }
 *   { type: 'dispose' }
 */

let video = null

const dispose = () => {
  if (video) {
    video.pause?.()
    video.removeAttribute?.('src')
    video.load?.()
    video = null
  }
}

const seekTo = (element, time) =>
  new Promise((resolve, reject) => {
    const onSeeked = () => {
      element.removeEventListener('seeked', onSeeked)
      element.removeEventListener('error', onError)
      resolve()
    }
    const onError = () => {
      element.removeEventListener('seeked', onSeeked)
      element.removeEventListener('error', onError)
      reject(new Error('Video seek failed'))
    }
    element.addEventListener('seeked', onSeeked)
    element.addEventListener('error', onError)
    element.currentTime = Math.max(0, time)
  })

const generate = async (message) => {
  const { id, url, count, width, height, durationSeconds } = message
  const element = document.createElement('video')
  element.muted = true
  element.playsInline = true
  element.crossOrigin = 'anonymous'
  element.preload = 'auto'
  element.src = url
  video = element

  await new Promise((resolve, reject) => {
    element.addEventListener('loadeddata', resolve, { once: true })
    element.addEventListener('error', () => reject(new Error('Unable to load video for thumbnails')), {
      once: true,
    })
  })

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const thumbs = []
  const total = Math.max(1, count)

  for (let i = 0; i < total; i += 1) {
    const time = durationSeconds > 0 ? (durationSeconds * i) / total : 0
    try {
      await seekTo(element, time)
    } catch {
      break
    }
    ctx.drawImage(element, 0, 0, width, height)
    const bitmap = canvas.transferToImageBitmap()
    thumbs.push({ time, bitmap })
    self.postMessage({ type: 'progress', id, ratio: (i + 1) / total })
  }

  self.postMessage({ type: 'thumbnails', id, thumbs }, thumbs.map((thumb) => thumb.bitmap))
  dispose()
}

self.onmessage = async (event) => {
  const message = event.data
  try {
    switch (message.type) {
      case 'generate':
        await generate(message)
        break
      case 'dispose':
        dispose()
        self.postMessage({ type: 'disposed' })
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

