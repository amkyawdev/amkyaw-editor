import type { Layer } from '@/types/layer'
import { clamp } from '@/lib/math'

export type AudioChannelState = {
  layerId: string
  gain: number
  muted: boolean
  solo: boolean
  pan: number
}

export type AudioClip = {
  layerId: string
  buffer: AudioBuffer
  startFrame: number
  endFrame: number
  offsetSeconds: number
  gain: number
  pan: number
}

const DEFAULT_FADE_SECONDS = 0.01

export class AudioMixer {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private nodes = new Map<string, { source: AudioBufferSourceNode; gain: GainNode; panner: StereoPannerNode }>()
  private channels = new Map<string, AudioChannelState>()

  async ensureContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.context = new Ctor()
      this.master = this.context.createGain()
      this.master.gain.value = 1
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') await this.context.resume()
    return this.context
  }

  get sampleRate(): number {
    return this.context?.sampleRate ?? 48000
  }

  setChannel(layerId: string, patch: Partial<AudioChannelState>): void {
    const current = this.channels.get(layerId) ?? {
      layerId,
      gain: 1,
      muted: false,
      solo: false,
      pan: 0,
    }
    this.channels.set(layerId, { ...current, ...patch })
  }

  getChannel(layerId: string): AudioChannelState {
    return (
      this.channels.get(layerId) ?? { layerId, gain: 1, muted: false, solo: false, pan: 0 }
    )
  }

  private anySolo(): boolean {
    for (const channel of this.channels.values()) if (channel.solo) return true
    return false
  }

  async scheduleClip(clip: AudioClip, startAtSeconds: number): Promise<void> {
    const context = await this.ensureContext()
    if (!context || !this.master) return
    this.stop(clip.layerId)

    const channel = this.getChannel(clip.layerId)
    const soloed = this.anySolo()
    const audible = !channel.muted && (!soloed || channel.solo)

    const source = context.createBufferSource()
    source.buffer = clip.buffer

    const gain = context.createGain()
    const panner = context.createStereoPanner()
    panner.pan.value = clamp(clip.pan, -1, 1)

    const target = audible ? channel.gain * clip.gain : 0
    const start = Math.max(context.currentTime, startAtSeconds)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(target, start + DEFAULT_FADE_SECONDS)

    source.connect(gain)
    gain.connect(panner)
    panner.connect(this.master)

    const duration = clip.buffer.duration - clip.offsetSeconds
    source.start(start, clip.offsetSeconds, Math.max(0, duration))

    this.nodes.set(clip.layerId, { source, gain, panner })
    source.onended = () => {
      if (this.nodes.get(clip.layerId)?.source === source) this.nodes.delete(clip.layerId)
    }
  }

  stop(layerId: string): void {
    const node = this.nodes.get(layerId)
    if (!node) return
    try {
      node.source.stop()
    } catch {
      // Already stopped; ignore.
    }
    node.source.disconnect()
    node.gain.disconnect()
    node.panner.disconnect()
    this.nodes.delete(layerId)
  }

  stopAll(): void {
    for (const layerId of [...this.nodes.keys()]) this.stop(layerId)
  }

  setMasterGain(value: number): void {
    if (this.master) this.master.gain.value = clamp(value, 0, 2)
  }

  async decode(buffer: ArrayBuffer): Promise<AudioBuffer | null> {
    const context = await this.ensureContext()
    if (!context) return null
    return context.decodeAudioData(buffer.slice(0))
  }

  dispose(): void {
    this.stopAll()
    this.channels.clear()
    void this.context?.close()
    this.context = null
    this.master = null
  }
}

export const audioLayersOf = (layers: Layer[]): Layer[] =>
  layers.filter((layer) => layer.type === 'audio' && layer.visible)
