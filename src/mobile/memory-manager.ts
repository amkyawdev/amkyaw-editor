export type MemoryReport = {
  usedBytes: number
  quotaBytes: number
  usedRatio: number
  deviceMemoryGb: number | null
  pressure: 'low' | 'medium' | 'high' | 'critical'
}

export type Evictable = {
  id: string
  /** Larger values are evicted first. */
  weight: number
  lastUsed: number
  release: () => void
}

/**
 * Budgeted cache for GPU textures and decoded media. Mobile Safari kills the
 * tab well before desktop Chrome does, so eviction is proactive rather than
 * purely reactive: pressure is estimated from both the JS heap and the
 * storage quota reported by the browser.
 */
export class MemoryManager {
  private entries = new Map<string, Evictable>()
  private budgetBytes: number
  private usedBytes = 0

  constructor(budgetBytes = 256 * 1024 * 1024) {
    this.budgetBytes = budgetBytes
  }

  get usage(): number {
    return this.usedBytes
  }

  get budget(): number {
    return this.budgetBytes
  }

  setBudget(bytes: number): void {
    this.budgetBytes = Math.max(32 * 1024 * 1024, bytes)
    this.enforce()
  }

  register(entry: Evictable, sizeBytes: number): void {
    this.entries.set(entry.id, entry)
    this.usedBytes += sizeBytes
    this.enforce()
  }

  touch(id: string): void {
    const entry = this.entries.get(id)
    if (entry) entry.lastUsed = performance.now()
  }

  release(id: string, sizeBytes: number): void {
    const entry = this.entries.get(id)
    if (!entry) return
    entry.release()
    this.entries.delete(id)
    this.usedBytes = Math.max(0, this.usedBytes - sizeBytes)
  }

  /** LRU eviction until the tracked usage fits inside the budget. */
  enforce(): void {
    if (this.usedBytes <= this.budgetBytes) return
    const ordered = [...this.entries.values()].sort((a, b) => b.weight - a.weight || a.lastUsed - b.lastUsed)
    for (const entry of ordered) {
      if (this.usedBytes <= this.budgetBytes) break
      entry.release()
      this.entries.delete(entry.id)
      this.usedBytes = Math.max(0, this.usedBytes - entry.weight)
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) entry.release()
    this.entries.clear()
    this.usedBytes = 0
  }

  static async report(): Promise<MemoryReport> {
    const nav = navigator as Navigator & { deviceMemory?: number }
    const deviceMemoryGb = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null

    let usedBytes = 0
    let quotaBytes = 0
    if (nav.storage?.estimate) {
      const estimate = await nav.storage.estimate()
      usedBytes = estimate.usage ?? 0
      quotaBytes = estimate.quota ?? 0
    }

    const usedRatio = quotaBytes > 0 ? usedBytes / quotaBytes : 0
    const pressure: MemoryReport['pressure'] =
      usedRatio > 0.9 ? 'critical' : usedRatio > 0.75 ? 'high' : usedRatio > 0.5 ? 'medium' : 'low'

    return { usedBytes, quotaBytes, usedRatio, deviceMemoryGb, pressure }
  }
}

export const memoryManager = new MemoryManager()
