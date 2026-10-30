import { ffmpegManager, type FfmpegProgress } from './ffmpeg-manager'
import { resolveScene } from './scene-graph'
import { buildCompositeList } from './compositor'
import { saveBlob } from '@/mobile/file-system'
import type { Project } from '@/types/project'
import type { EffectInstance } from '@/types/effect'

export type ExportPhase = 'idle' | 'rendering' | 'encoding' | 'done' | 'error'

export type ExportProgress = {
  phase: ExportPhase
  ratio: number
  message: string
  renderedFrames: number
  totalFrames: number
}

export type ExportResult = {
  blob: Blob
  filename: string
  savedAs: 'shared' | 'downloaded'
}

const MAX_OFFLINE_FRAMES = 3000

const extensionFor = (format: Project['exportSettings']['format']): string =>
  format === 'png-sequence' ? 'png' : format === 'webp' ? 'webp' : format === 'gif' ? 'gif' : format === 'webm' ? 'webm' : 'mp4'

/**
 * Headless export. Each frame is composited on a 2D canvas at project
 * resolution, converted to raw RGBA, then handed to FFmpeg in one batch. The
 * 2D path is used instead of WebGL because readback from a WebGL surface
 * requires a framebuffer copy per frame, which is slower than drawing to a
 * canvas the browser can keep mapped.
 */
export class ExportPipeline {
  private cancelled = false

  cancel(): void {
    this.cancelled = true
  }

  private renderFrameToCanvas(
    canvas: HTMLCanvasElement,
    project: Project,
    frame: number,
  ): Uint8Array {
    const ctx = canvas.getContext('2d', { alpha: project.exportSettings.transparent })
    if (!ctx) throw new Error('Unable to create a 2D export context')

    const { width, height } = project.exportSettings
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, width, height)
    if (!project.exportSettings.transparent) {
      ctx.fillStyle = `rgba(${project.backgroundColor.r * 255}, ${project.backgroundColor.g * 255}, ${project.backgroundColor.b * 255}, ${project.backgroundColor.a})`
      ctx.fillRect(0, 0, width, height)
    }

    const resolved = resolveScene(project.layers, {
      frame,
      tracks: project.keyframeTracks,
      effects: project.effects,
    })
    const composite = buildCompositeList(resolved, { width, height })

    for (const item of composite) {
      const { layer, transform, opacity, effects } = item.resolved
      ctx.save()
      ctx.globalAlpha = opacity
      const filters: string[] = []
      for (const effect of effects as EffectInstance[]) {
        if (effect.kind === 'brightness') filters.push(`brightness(${1 + (effect.values.amount ?? 0)})`)
        else if (effect.kind === 'contrast') filters.push(`contrast(${effect.values.amount ?? 1})`)
        else if (effect.kind === 'saturation') filters.push(`saturate(${effect.values.amount ?? 1})`)
        else if (effect.kind === 'hue') filters.push(`hue-rotate(${effect.values.degrees ?? 0}deg)`)
        else if (effect.kind === 'blur') filters.push(`blur(${effect.values.radius ?? 0}px)`)
      }
      ctx.filter = filters.length > 0 ? filters.join(' ') : 'none'

      const centerX = width / 2 + transform.position.x
      const centerY = height / 2 + transform.position.y
      ctx.translate(centerX, centerY)
      if (transform.rotation !== 0) ctx.rotate((transform.rotation * Math.PI) / 180)
      ctx.scale(transform.scale.x, transform.scale.y)

      if (layer.shape) {
        ctx.fillStyle = `rgba(${layer.shape.fill.r * 255}, ${layer.shape.fill.g * 255}, ${layer.shape.fill.b * 255}, ${layer.shape.fill.a})`
        const w = width * 0.5
        const h = height * 0.5
        if (layer.shape.kind === 'ellipse') {
          ctx.beginPath()
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-w / 2, -h / 2, w, h)
        }
      } else if (layer.text) {
        ctx.fillStyle = `rgba(${layer.text.color.r * 255}, ${layer.text.color.g * 255}, ${layer.text.color.b * 255}, ${layer.text.color.a})`
        ctx.font = `${layer.text.fontWeight} ${layer.text.fontSize}px ${layer.text.fontFamily}`
        ctx.textAlign = layer.text.align
        ctx.textBaseline = 'middle'
        ctx.fillText(layer.text.content, 0, 0)
      }

      ctx.restore()
      ctx.filter = 'none'
    }

    const imageData = ctx.getImageData(0, 0, width, height)
    return new Uint8Array(imageData.data.buffer)
  }

  async run(
    project: Project,
    onProgress: (progress: ExportProgress) => void,
  ): Promise<ExportResult> {
    this.cancelled = false
    const { exportSettings, durationFrames, fps } = project
    const { width, height } = exportSettings
    const totalFrames = Math.min(durationFrames, MAX_OFFLINE_FRAMES)

    if (totalFrames <= 0) throw new Error('Project has no frames to export')

    onProgress({ phase: 'rendering', ratio: 0, message: 'Preparing…', renderedFrames: 0, totalFrames })

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const frames: Uint8Array[] = []
    for (let frame = 0; frame < totalFrames; frame += 1) {
      if (this.cancelled) throw new Error('Export cancelled')
      frames.push(this.renderFrameToCanvas(canvas, project, frame))
      if (frame % 5 === 0 || frame === totalFrames - 1) {
        onProgress({
          phase: 'rendering',
          ratio: (frame + 1) / totalFrames,
          message: `Rendering frame ${frame + 1} / ${totalFrames}`,
          renderedFrames: frame + 1,
          totalFrames,
        })
        // Yield so the UI can paint progress between frames.
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }

    const blob = await ffmpegManager.encode({
      frames,
      width,
      height,
      fps,
      settings: exportSettings,
      audio: null,
      onProgress: (progress: FfmpegProgress) => {
        onProgress({
          phase: progress.phase === 'done' ? 'done' : 'encoding',
          ratio: progress.ratio,
          message: progress.message,
          renderedFrames: totalFrames,
          totalFrames,
        })
      },
    })

    const filename = `${project.name.replace(/[^\w.-]+/g, '_') || 'export'}.${extensionFor(exportSettings.format)}`
    const savedAs = await saveBlob(blob, filename, project.name)
    onProgress({ phase: 'done', ratio: 1, message: 'Export complete', renderedFrames: totalFrames, totalFrames })

    return { blob, filename, savedAs }
  }
}

export const exportPipeline = new ExportPipeline()
