export type PerformanceSample = {
  fps: number
  frameTimeMs: number
  jank: number
  timestamp: number
}

export type PerformanceStats = {
  currentFps: number
  averageFps: number
  minFps: number
  p95FrameTimeMs: number
  droppedFrames: number
  jankRatio: number
  samples: number
  degraded: boolean
}

const WINDOW_SIZE = 120
/** Below this the UI drops preview resolution / disables live effects. */
const DEGRADED_FPS_THRESHOLD = 24

export class PerformanceMonitor {
  private samples: PerformanceSample[] = []
  private rafId: number | null = null
  private lastTimestamp = 0
  private running = false
  private listeners = new Set<(stats: PerformanceStats) => void>()

  get isRunning(): boolean {
    return this.running
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTimestamp = 0
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  reset(): void {
    this.samples = []
    this.lastTimestamp = 0
  }

  subscribe(listener: (stats: PerformanceStats) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Records an externally measured frame time (e.g. from the render loop). */
  record(frameTimeMs: number): void {
    const sample: PerformanceSample = {
      fps: frameTimeMs > 0 ? 1000 / frameTimeMs : 0,
      frameTimeMs,
      jank: frameTimeMs > 1000 / 30 ? 1 : 0,
      timestamp: Date.now(),
    }
    this.samples.push(sample)
    if (this.samples.length > WINDOW_SIZE) this.samples.shift()
  }

  getStats(): PerformanceStats {
    if (this.samples.length === 0) {
      return {
        currentFps: 0,
        averageFps: 0,
        minFps: 0,
        p95FrameTimeMs: 0,
        droppedFrames: 0,
        jankRatio: 0,
        samples: 0,
        degraded: false,
      }
    }
    const times = this.samples.map((sample) => sample.frameTimeMs).sort((a, b) => a - b)
    const total = times.reduce((sum, value) => sum + value, 0)
    const averageFrameTime = total / times.length
    const p95Index = Math.min(times.length - 1, Math.floor(times.length * 0.95))
    const jankCount = this.samples.reduce((sum, sample) => sum + sample.jank, 0)
    const averageFps = averageFrameTime > 0 ? 1000 / averageFrameTime : 0

    return {
      currentFps: this.samples[this.samples.length - 1].fps,
      averageFps,
      minFps: times.length > 0 ? 1000 / times[times.length - 1] : 0,
      p95FrameTimeMs: times[p95Index],
      droppedFrames: jankCount,
      jankRatio: jankCount / this.samples.length,
      samples: this.samples.length,
      degraded: averageFps > 0 && averageFps < DEGRADED_FPS_THRESHOLD,
    }
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return
    if (this.lastTimestamp !== 0) this.record(timestamp - this.lastTimestamp)
    this.lastTimestamp = timestamp
    if (this.samples.length % 30 === 0) {
      const stats = this.getStats()
      for (const listener of this.listeners) listener(stats)
    }
    this.rafId = requestAnimationFrame(this.tick)
  }
}

export const performanceMonitor = new PerformanceMonitor()
