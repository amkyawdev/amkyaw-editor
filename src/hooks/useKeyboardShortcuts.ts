import { useEffect, useRef } from 'react'

export type KeyboardShortcut = {
  /** `mod` maps to Cmd on macOS and Ctrl elsewhere. */
  key: string
  mod?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  handler: (event: KeyboardEvent) => void
  /** Allow firing while a text input is focused. */
  allowInInput?: boolean
}

const isEditable = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled = true): void => {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const editable = isEditable(event.target)
      for (const shortcut of shortcutsRef.current) {
        if (editable && !shortcut.allowInInput) continue
        const mod = event.metaKey || event.ctrlKey
        if (Boolean(shortcut.mod) !== mod) continue
        if (Boolean(shortcut.shift) !== event.shiftKey) continue
        if (Boolean(shortcut.alt) !== event.altKey) continue
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue
        event.preventDefault()
        shortcut.handler(event)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
