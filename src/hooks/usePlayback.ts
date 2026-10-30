import { useEffect, useMemo, useRef } from 'react'
import { TimeController } from '@/core/time-controller'
import { useEditorStore } from '@/store/editorStore'
import { useProjectStore } from '@/store/projectStore'

export type UsePlaybackResult = {
  seek: (frame: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
  stepBy: (delta: number) => void
}

/**
 * Binds the TimeController to the editor/project stores. The controller owns
 * wall-clock time; the store owns the authoritative frame so any component can
 * read or seek it.
 */
export const usePlayback = (): UsePlaybackResult => {
  const fps = useProjectStore((state) => state.project.fps)
  const durationFrames = useProjectStore((state) => state.project.durationFrames)
  const loop = useEditorStore((state) => state.loop)
  const playbackRate = useEditorStore((state) => state.playbackRate)
  const playing = useEditorStore((state) => state.playing)
  const setCurrentFrame = useEditorStore((state) => state.setCurrentFrame)
  const setPlaying = useEditorStore((state) => state.setPlaying)

  const controllerRef = useRef<TimeController | null>(null)

  if (!controllerRef.current) {
    controllerRef.current = new TimeController({
      fps,
      durationFrames,
      loop,
      playbackRate,
      onTick: ({ frame }) => setCurrentFrame(frame),
      onEnded: () => setPlaying(false),
    })
  }

  useEffect(() => {
    controllerRef.current?.update({ fps, durationFrames, loop, playbackRate })
  }, [fps, durationFrames, loop, playbackRate])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return
    if (playing) controller.play()
    else controller.pause()
  }, [playing])

  useEffect(() => () => controllerRef.current?.dispose(), [])

  return useMemo(
    () => ({
      seek: (frame: number) => {
        controllerRef.current?.seek(frame)
        setCurrentFrame(frame)
      },
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      toggle: () => setPlaying(!useEditorStore.getState().playing),
      stepBy: (delta: number) => {
        const next = useEditorStore.getState().currentFrame + delta
        controllerRef.current?.seek(next)
        setCurrentFrame(next)
      },
    }),
    [setCurrentFrame, setPlaying],
  )
}
