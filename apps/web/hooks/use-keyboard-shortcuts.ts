import { useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const isCtrlPressed = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : true
        const isMetaPressed = shortcut.metaKey ? event.metaKey : true
        const isShiftPressed = shortcut.shiftKey ? event.shiftKey : !shortcut.shiftKey ? !event.shiftKey : true
        const isAltPressed = shortcut.altKey ? event.altKey : !shortcut.altKey ? !event.altKey : true
        
        // Handle both Cmd (Mac) and Ctrl (Windows/Linux)
        const isModifierPressed = shortcut.ctrlKey || shortcut.metaKey ? 
          (event.ctrlKey || event.metaKey) : true

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          isModifierPressed &&
          (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
          (shortcut.altKey === undefined || event.altKey === shortcut.altKey)
        ) {
          event.preventDefault()
          shortcut.handler()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}