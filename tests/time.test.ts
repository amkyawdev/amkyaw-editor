import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDuration,
  framesToSeconds,
  framesToTimecode,
  secondsToFrames,
  timecodeToFrames,
} from '@/lib/time'

describe('time helpers', () => {
  it('converts between seconds and frames', () => {
    expect(secondsToFrames(1.5, 30)).toBe(45)
    expect(framesToSeconds(45, 30)).toBe(1.5)
  })

  it('formats timecode as HH:MM:SS:FF', () => {
    expect(framesToTimecode(0, 30)).toBe('00:00:00:00')
    expect(framesToTimecode(30, 30)).toBe('00:00:01:00')
    expect(framesToTimecode(95, 30)).toBe('00:00:03:05')
    expect(framesToTimecode(-5, 30)).toBe('00:00:00:00')
  })

  it('parses timecode back to frames (round trip)', () => {
    for (const frames of [0, 29, 30, 1234, 108000]) {
      expect(timecodeToFrames(framesToTimecode(frames, 25), 25)).toBe(frames)
    }
  })

  it('returns 0 for malformed timecode', () => {
    expect(timecodeToFrames('nope', 30)).toBe(0)
  })

  it('formats durations and byte sizes', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(125)).toBe('2:05')
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1024 * 1024 * 5)).toBe('5 MB')
  })
})
