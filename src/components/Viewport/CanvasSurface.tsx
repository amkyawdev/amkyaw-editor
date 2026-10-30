import { useEffect, useRef, useState } from 'react'
import { WebGLRenderer } from '@/core/renderer'
import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'

export type CanvasSurfaceProps = {
  /** Called with the live renderer so the app can composite layers into it. */
  onReady?: (renderer: WebGLRenderer) => void
  className?: string
}

/**
 * Owns the WebGL2 canvas. `WebGLRenderer.isSupported()` is checked up-front so
 * unsupported browsers get a clear fallback message instead of a blank canvas.
 */
export const CanvasSurface = ({ onReady, className }: CanvasSurfaceProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const [supported, setSupported] = useState(true)

  const resolution = useProjectStore((state) => state.project.resolution)
  const backgroundColor = useProjectStore((state) => state.project.backgroundColor)
  const gridVisible = useEditorStore((state) => state.gridVisible)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!WebGLRenderer.isSupported()) {
      setSupported(false)
      return
    }
    const renderer = new WebGLRenderer(canvas)
    if (!renderer.init()) {
      setSupported(false)
      return
    }
    rendererRef.current = renderer
    onReady?.(renderer)
    return () => {
      renderer.dispose()
      rendererRef.current = null
    }
  }, [onReady])

  useEffect(() => {
    const renderer = rendererRef.current
    const canvas = canvasRef.current
    if (!renderer || !canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const rect = canvas.getBoundingClientRect()
    renderer.resize(rect.width, rect.height, dpr)
    renderer.draw(null, {
      effects: [],
      opacity: 1,
      blur: 0,
      rect: { x: 0, y: 0, width: rect.width, height: rect.height },
      viewport: { width: rect.width, height: rect.height },
      time: 0,
      backgroundColor,
    })
  }, [resolution, backgroundColor])

  if (!supported) {
    return (
      <div className={`flex items-center justify-center bg-black text-center text-sm text-slate-400 ${className ?? ''}`}>
        <p className="max-w-xs px-6">
          WebGL2 is required to preview and export. Please update your browser or enable hardware acceleration.
        </p>
      </div>
    )
  }

  return (
    <div className={`relative flex items-center justify-center bg-black ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ aspectRatio: `${resolution.width} / ${resolution.height}` }}
        aria-label="Preview canvas"
      />
      {gridVisible ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, #5b8cff 1px, transparent 1px), linear-gradient(to bottom, #5b8cff 1px, transparent 1px)',
            backgroundSize: '10% 10%',
          }}
        />
      ) : null}
    </div>
  )
}
