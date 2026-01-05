"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface KeyboardShortcut {
  /** Key combination (e.g., "Escape", "Ctrl+k", "Meta+k") */
  key: string
  /** Handler function */
  handler: () => void
  /** Description for help menu */
  description?: string
  /** Whether to prevent default behavior */
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  /** Shortcuts to register */
  shortcuts: KeyboardShortcut[]
  /** Whether shortcuts are enabled */
  enabled?: boolean
}

/**
 * useKeyboardShortcuts Hook
 * 
 * Register keyboard shortcuts for common actions
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key
      const isCtrl = e.ctrlKey || e.metaKey
      const isShift = e.shiftKey
      const isAlt = e.altKey

      for (const shortcut of shortcuts) {
        const [modifier, shortcutKey] = shortcut.key.split("+").map((s) => s.trim())

        let matches = false

        if (modifier === "Ctrl" || modifier === "Meta") {
          matches = isCtrl && key.toLowerCase() === shortcutKey.toLowerCase()
        } else if (modifier === "Shift") {
          matches = isShift && key.toLowerCase() === shortcutKey.toLowerCase()
        } else if (modifier === "Alt") {
          matches = isAlt && key.toLowerCase() === shortcutKey.toLowerCase()
        } else {
          // No modifier, just the key
          matches = key === shortcut.key
        }

        if (matches) {
          if (shortcut.preventDefault) {
            e.preventDefault()
          }
          shortcut.handler()
          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts, enabled])
}

/**
 * Common Keyboard Shortcuts Component
 * 
 * Shows available keyboard shortcuts
 */
interface KeyboardShortcutsHelpProps {
  shortcuts: Array<{
    key: string
    description: string
  }>
  className?: string
}

export function KeyboardShortcutsHelp({
  shortcuts,
  className,
}: KeyboardShortcutsHelpProps) {
  return (
    <div className={className}>
      <h4 className="text-sm font-medium mb-2">Keyboard Shortcuts</h4>
      <div className="space-y-1 text-xs">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

