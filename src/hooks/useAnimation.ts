import { useCallback, useMemo } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useEditorStore } from '@/store/editorStore'
import { evaluateKeyframes } from '@/animations/keyframes'
import { createId } from '@/lib/id'
import type { AnimatableProperty, Keyframe, KeyframeValue, Track } from '@/types/animation'
import type { AnimationPreset } from '@/types/animation'

export type UseAnimationResult = {
  tracksForLayer: (layerId: string) => Track[]
  trackFor: (layerId: string, property: AnimatableProperty) => Track | undefined
  valueAt: (layerId: string, property: AnimatableProperty, fallback: number) => number
  addKeyframe: (layerId: string, property: AnimatableProperty, value: KeyframeValue, frame?: number) => void
  removeKeyframe: (trackId: string, frame: number) => void
  applyPreset: (layerId: string, preset: AnimationPreset, baseFrame?: number) => void
}

export const useAnimation = (): UseAnimationResult => {
  const keyframeTracks = useProjectStore((state) => state.project.keyframeTracks)
  const addTrack = useProjectStore((state) => state.addTrack)
  const updateTrack = useProjectStore((state) => state.updateTrack)
  const currentFrame = useEditorStore((state) => state.currentFrame)

  const byLayer = useMemo(() => {
    const map = new Map<string, Track[]>()
    for (const track of keyframeTracks) {
      const list = map.get(track.layerId) ?? []
      list.push(track)
      map.set(track.layerId, list)
    }
    return map
  }, [keyframeTracks])

  const tracksForLayer = useCallback((layerId: string) => byLayer.get(layerId) ?? [], [byLayer])

  const trackFor = useCallback(
    (layerId: string, property: AnimatableProperty) =>
      keyframeTracks.find((track) => track.layerId === layerId && track.property === property),
    [keyframeTracks],
  )

  const valueAt = useCallback(
    (layerId: string, property: AnimatableProperty, fallback: number) => {
      const track = keyframeTracks.find(
        (candidate) => candidate.layerId === layerId && candidate.property === property,
      )
      if (!track) return fallback
      const value = evaluateKeyframes(track.keyframes as Keyframe<KeyframeValue>[], currentFrame)
      return typeof value === 'number' ? value : fallback
    },
    [keyframeTracks, currentFrame],
  )

  const addKeyframe = useCallback(
    (layerId: string, property: AnimatableProperty, value: KeyframeValue, frame = currentFrame) => {
      const existing = keyframeTracks.find(
        (track) => track.layerId === layerId && track.property === property,
      )
      const keyframe: Keyframe<KeyframeValue> = {
        id: createId('keyframe'),
        frame: Math.round(frame),
        value,
        easing: 'easeInOutCubic',
      }
      if (!existing) {
        addTrack({
          id: createId('track'),
          layerId,
          property,
          keyframes: [keyframe as Keyframe],
          enabled: true,
          muted: false,
        })
        return
      }
      const keyframes = [
        ...existing.keyframes.filter((kf) => kf.frame !== keyframe.frame),
        keyframe as Keyframe,
      ].sort((a, b) => a.frame - b.frame)
      updateTrack(existing.id, { keyframes })
    },
    [keyframeTracks, currentFrame, addTrack, updateTrack],
  )

  const removeKeyframe = useCallback(
    (trackId: string, frame: number) => {
      const track = keyframeTracks.find((candidate) => candidate.id === trackId)
      if (!track) return
      updateTrack(trackId, { keyframes: track.keyframes.filter((kf) => kf.frame !== frame) })
    },
    [keyframeTracks, updateTrack],
  )

  const applyPreset = useCallback(
    (layerId: string, preset: AnimationPreset, baseFrame = currentFrame) => {
      for (const generated of preset.build(baseFrame)) {
        for (const keyframe of generated.keyframes) {
          addKeyframe(layerId, generated.property, keyframe.value as KeyframeValue, keyframe.frame)
        }
      }
    },
    [addKeyframe, currentFrame],
  )

  return { tracksForLayer, trackFor, valueAt, addKeyframe, removeKeyframe, applyPreset }
}
