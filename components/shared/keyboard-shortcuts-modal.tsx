"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Keyboard } from "lucide-react"

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

const GLOBAL_SHORTCUTS: Shortcut[] = [
  { keys: ["?"], description: "Show keyboard shortcuts", category: "General" },
  { keys: ["⌘", "K"], description: "Open search", category: "General" },
  { keys: ["Esc"], description: "Close modal / Cancel", category: "General" },
]

const DOCTOR_SHORTCUTS: Shortcut[] = [
  { keys: ["J"], description: "Next intake in queue", category: "Navigation" },
  { keys: ["K"], description: "Previous intake in queue", category: "Navigation" },
  { keys: ["Enter"], description: "Open selected intake", category: "Navigation" },
  { keys: ["A"], description: "Approve intake", category: "Actions" },
  { keys: ["D"], description: "Decline intake", category: "Actions" },
  { keys: ["R"], description: "Refresh queue", category: "Actions" },
  { keys: ["F"], description: "Toggle filters", category: "Actions" },
  { keys: ["⌘", "Enter"], description: "Submit and approve", category: "Actions" },
]

const PATIENT_SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "S"], description: "Save draft", category: "Form" },
  { keys: ["Tab"], description: "Next field", category: "Form" },
  { keys: ["⇧", "Tab"], description: "Previous field", category: "Form" },
]

const ADMIN_SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "⇧", "F"], description: "Global search", category: "Navigation" },
  { keys: ["G", "D"], description: "Go to dashboard", category: "Navigation" },
  { keys: ["G", "Q"], description: "Go to queue", category: "Navigation" },
  { keys: ["G", "S"], description: "Go to settings", category: "Navigation" },
]

interface KeyboardShortcutsModalProps {
  context?: "global" | "doctor" | "patient" | "admin"
  customShortcuts?: Shortcut[]
}

export function KeyboardShortcutsModal({
  context = "global",
  customShortcuts = [],
}: KeyboardShortcutsModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Get shortcuts based on context
  const getShortcuts = useCallback(() => {
    let shortcuts = [...GLOBAL_SHORTCUTS]
    
    switch (context) {
      case "doctor":
        shortcuts = [...shortcuts, ...DOCTOR_SHORTCUTS]
        break
      case "patient":
        shortcuts = [...shortcuts, ...PATIENT_SHORTCUTS]
        break
      case "admin":
        shortcuts = [...shortcuts, ...ADMIN_SHORTCUTS]
        break
    }
    
    if (customShortcuts.length > 0) {
      shortcuts = [...shortcuts, ...customShortcuts]
    }
    
    return shortcuts
  }, [context, customShortcuts])

  // Listen for ? key to open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const shortcuts = getShortcuts()
  const categories = [...new Set(shortcuts.map((s) => s.category))]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick actions to navigate and work faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h4>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex}>
                            <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border shadow-sm">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground mx-0.5">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">?</kbd> anytime to show this
          </p>
          <Badge variant="outline" className="text-xs">
            {context} mode
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options: {
    enabled?: boolean
    preventDefault?: boolean
    ignoreInputs?: boolean
  } = {}
) {
  const { enabled = true, preventDefault = true, ignoreInputs = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      if (ignoreInputs) {
        const target = e.target as HTMLElement
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return
        }
      }

      // Check if all keys match
      const keyMap: Record<string, boolean> = {
        "⌘": e.metaKey,
        "Ctrl": e.ctrlKey,
        "⇧": e.shiftKey,
        "Alt": e.altKey,
        "Shift": e.shiftKey,
      }

      const modifierKeys = ["⌘", "Ctrl", "⇧", "Alt", "Shift"]
      const regularKeys = keys.filter((k) => !modifierKeys.includes(k))
      const requiredModifiers = keys.filter((k) => modifierKeys.includes(k))

      // Check modifiers
      const modifiersMatch = requiredModifiers.every((mod) => keyMap[mod])
      
      // Check regular key
      const keyMatches = regularKeys.some(
        (k) => e.key.toLowerCase() === k.toLowerCase()
      )

      if (modifiersMatch && keyMatches) {
        if (preventDefault) {
          e.preventDefault()
        }
        callback()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [keys, callback, enabled, preventDefault, ignoreInputs])
}

/**
 * Shortcut hint badge component
 */
export function ShortcutHint({ keys }: { keys: string[] }) {
  return (
    <span className="hidden sm:inline-flex items-center gap-0.5 ml-2">
      {keys.map((key, index) => (
        <span key={index}>
          <kbd className="px-1 py-0.5 text-xs font-mono bg-muted/50 rounded border border-border/50">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </span>
      ))}
    </span>
  )
}
