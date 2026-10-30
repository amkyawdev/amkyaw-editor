import { clamp } from '@/lib/math'

export type PlaybackTick = {
  frame: number
  seconds: number
  deltaSeconds: number
}

export type TimeControllerOptions = {
  fps: number
  durationFrames: number
  loop?: boolean
  playbackRate?: number
  onTick: (tick: PlaybackTick) => void
  onEnded?: () => void
}

/**
 * Drives playback with a wall-clock accumulator rather than adding a fixed step
 * per frame, so dropped animation frames do not slow the timeline down.
 */
export class TimeController {
  private options: TimeControllerOptions
  private rafId: number | null = null
  private lastTimestamp = 0
  private accumulator = 0
  private frame = 0
  private playing = false

  constructor(options: TimeControllerOptions) {
    this.options = { loop: true, playbackRate: 1, ...options }
  }

  get currentFrame(): number {
    return this.frame
  }

  get isPlaying(): boolean {
    return this.playing
  }

  update(options: Partial<TimeControllerOptions>): void {
    this.options = { ...this.options, ...options }
  }

  seek(frame: number): void {
    this.frame = clamp(Math.round(frame), 0, this.options.durationFrames)
    this.accumulator = 0
    this.options.onTick({ frame: this.frame, seconds: this.frame / this.options.fps, deltaSeconds: 0 })
  }

  play(): void {
    if (this.playing) return
    this.playing = true
    this.lastTimestamp = 0
    this.accumulator = 0
    this.rafId = requestAnimationFrame(this.step)
  }

  pause(): void {
    this.playing = false
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  toggle(): void {
    if (this.playing) this.pause()
    else this.play()
  }

  dispose(): void {
    this.pause()
  }

  private step = (timestamp: number): void => {
    if (!this.playing) return
    const { fps, durationFrames, loop, playbackRate = 1 } = this.options

    if (this.lastTimestamp === 0) this.lastTimestamp = timestamp
    const deltaSeconds = Math.min(0.25, (timestamp - this.lastTimestamp) / 1000)
    this.lastTimestamp = timestamp

    this.accumulator += deltaSeconds * playbackRate * fps
    const wholeFrames = Math.floor(this.accumulator)
    if (wholeFrames > 0) {
      this.accumulator -= wholeFrames
      this.frame += wholeFrames
      if (this.frame > durationFrames) {
        if (loop) {
          this.frame = this.frame % Math.max(1, durationFrames + 1)
        } else {
          this.frame = durationFrames
          this.options.onTick({ frame: this.frame, seconds: this.frame / fps, deltaSeconds })
          this.pause()
          this.options.onEnded?.()
          return
        }
      }
    }

    this.options.onTick({ frame: this.frame, seconds: this.frame / fps, deltaSeconds })
    this.rafId = requestAnimationFrame(this.step)
  }
}
