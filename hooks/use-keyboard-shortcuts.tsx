"use client"

import { useEffect, useCallback } from "react"

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  shortcuts: ShortcutConfig[]
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatches = shortcut.alt ? event.altKey : !event.altKey

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [enabled, shortcuts]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  return { shortcuts }
}

export function ShortcutsHelp({ shortcuts }: { shortcuts: ShortcutConfig[] }) {
  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <p className="font-medium mb-2">Keyboard Shortcuts:</p>
      {shortcuts.map((shortcut, i) => (
        <div key={i} className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
            {shortcut.ctrl && "⌘"}
            {shortcut.shift && "⇧"}
            {shortcut.alt && "⌥"}
            {shortcut.key.toUpperCase()}
          </kbd>
          <span>{shortcut.description}</span>
        </div>
      ))}
    </div>
  )
}
