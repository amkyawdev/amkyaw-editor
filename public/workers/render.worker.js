/// <reference lib="webworker" />
/**
 * OffscreenCanvas render worker. Frames are rendered here rather than on the
 * main thread so long exports do not freeze the editor UI.
 *
 * Protocol (main -> worker):
 *   { type: 'init', canvas, width, height, backgroundColor }
 *   { type: 'frame', id, layers }   -> replies { type: 'frame', buffer }
 *   { type: 'bitmap', id, layers }  -> replies { type: 'bitmap', bitmap }
 *   { type: 'dispose' }
 */

let canvas = null
let context = null
let background = [0, 0, 0, 1]

const postError = (id, error) => {
  self.postMessage({
    type: 'error',
    id,
    message: error instanceof Error ? error.message : String(error),
  })
}

const ensureContext = () => {
  if (!canvas) return null
  if (!context) context = canvas.getContext('2d', { alpha: true })
  return context
}

const applyFilters = (ctx, effects) => {
  const filters = []
  for (const effect of effects) {
    const values = effect.values || {}
    switch (effect.kind) {
      case 'brightness':
        filters.push(`brightness(${1 + (values.amount || 0)})`)
        break
      case 'contrast':
        filters.push(`contrast(${values.amount || 1})`)
        break
      case 'saturation':
        filters.push(`saturate(${values.amount || 1})`)
        break
      case 'hue':
        filters.push(`hue-rotate(${values.degrees || 0}deg)`)
        break
      case 'blur':
        filters.push(`blur(${values.radius || 0}px)`)
        break
      case 'glow':
        filters.push(`drop-shadow(0 0 ${(values.amount || 0) * 12}px rgba(255,255,255,0.6))`)
        break
      default:
        break
    }
  }
  ctx.filter = filters.length > 0 ? filters.join(' ') : 'none'
}

const drawLayer = (ctx, layer, width, height) => {
  if (!layer.bitmap) return
  ctx.save()
  ctx.globalAlpha = layer.opacity
  applyFilters(ctx, layer.effects)
  ctx.translate(layer.rect.x + layer.rect.width / 2, layer.rect.y + layer.rect.height / 2)
  if (layer.rotation !== 0) ctx.rotate((layer.rotation * Math.PI) / 180)
  ctx.drawImage(
    layer.bitmap,
    -layer.rect.width / 2,
    -layer.rect.height / 2,
    layer.rect.width,
    layer.rect.height,
  )
  ctx.restore()
  ctx.filter = 'none'

  // Radial effects cannot be expressed with canvas filters, so they run as a
  // second pass clipped to the layer's own pixels.
  for (const effect of layer.effects) {
    if (effect.kind !== 'vignette') continue
    const amount = effect.values?.amount ?? 0.4
    if (amount <= 0) continue
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.25,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75,
    )
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, `rgba(0,0,0,${amount})`)
    ctx.save()
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }
}

const renderFrame = (layers) => {
  const ctx = ensureContext()
  if (!ctx || !canvas) return
  const width = canvas.width
  const height = canvas.height

  ctx.globalAlpha = 1
  ctx.filter = 'none'
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = `rgba(${background[0] * 255}, ${background[1] * 255}, ${background[2] * 255}, ${background[3]})`
  ctx.fillRect(0, 0, width, height)

  for (const layer of layers) drawLayer(ctx, layer, width, height)
}

self.onmessage = (event) => {
  const message = event.data
  try {
    switch (message.type) {
      case 'init': {
        canvas = message.canvas
        canvas.width = message.width
        canvas.height = message.height
        background = message.backgroundColor
        context = null
        self.postMessage({ type: 'ready', width: message.width, height: message.height })
        break
      }
      case 'frame': {
        renderFrame(message.layers)
        const ctx = ensureContext()
        if (!ctx || !canvas) throw new Error('Render context not initialized')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const buffer = imageData.data.buffer
        self.postMessage(
          {
            type: 'frame',
            id: message.id,
            time: message.time,
            buffer,
            width: canvas.width,
            height: canvas.height,
          },
          [buffer],
        )
        break
      }
      case 'bitmap': {
        renderFrame(message.layers)
        if (!canvas) throw new Error('Render canvas not initialized')
        const bitmap = canvas.transferToImageBitmap()
        self.postMessage({ type: 'bitmap', id: message.id, time: message.time, bitmap }, [bitmap])
        break
      }
      case 'dispose': {
        canvas = null
        context = null
        self.postMessage({ type: 'disposed' })
        break
      }
      default:
        break
    }
  } catch (error) {
    postError(message && message.id != null ? message.id : null, error)
  }
}
