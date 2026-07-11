"use client"

/**
 * Doctor Keyboard Shortcuts Hook
 * 
 * P2 DOCTOR_WORKLOAD_AUDIT: Implements keyboard shortcuts to reduce clicks.
 * Saves ~8 minutes per 100 cases.
 * 
 * Shortcuts:
 * - ⌘/Ctrl + Enter: Approve current case
 * - ⌘/Ctrl + Shift + D: Open decline dialog
 * - ⌘/Ctrl + →: Navigate to next case in queue
 * - ⌘/Ctrl + ←: Navigate to previous case
 * - ⌘/Ctrl + N: Add clinical note
 * - Escape: Close dialogs
 */

import { useCallback,useEffect } from "react"

const INTERACTIVE_KEYBOARD_TARGET_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "summary",
  "a[href]",
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
  "[data-doctor-shortcuts-disabled]",
].join(",")

const INTERACTIVE_KEYBOARD_TARGET_TAGS = new Set([
  "BUTTON",
  "INPUT",
  "OPTION",
  "SELECT",
  "SUMMARY",
  "TEXTAREA",
])

/**
 * Unmodified navigation and single-key doctor shortcuts must never win over
 * typing, caret movement, or an interactive control's native keyboard
 * behaviour. Callers may retain explicit Escape or modifier-key actions.
 * `closest()` also catches nested elements such as an SVG inside a button or a
 * span inside an editor.
 */
export function isEditableOrInteractiveKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false

  const element = target as EventTarget & {
    tagName?: unknown
    isContentEditable?: unknown
    closest?: (selector: string) => unknown
  }
  const tagName = typeof element.tagName === "string" ? element.tagName.toUpperCase() : ""

  if (INTERACTIVE_KEYBOARD_TARGET_TAGS.has(tagName)) return true
  if (element.isContentEditable === true) return true
  if (typeof element.closest !== "function") return false

  return Boolean(element.closest(INTERACTIVE_KEYBOARD_TARGET_SELECTOR))
}

interface ShortcutHandlers {
  onApprove?: () => void
  onDecline?: () => void
  onNext?: () => void
  onPrevious?: () => void
  onNote?: () => void
  onEscape?: () => void
  disabled?: boolean
}

export function useDoctorShortcuts({
  onApprove,
  onDecline,
  onNext,
  onPrevious,
  onNote,
  onEscape,
  disabled = false,
}: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return

      const isInteractiveTarget = isEditableOrInteractiveKeyboardTarget(event.target)
      const isMod = event.metaKey || event.ctrlKey

      // Modifier chords and Escape are explicit doctor actions that must win
      // even while a control is focused — the review panel auto-focuses a
      // button on open, so gating these behind the interactive-target guard
      // (as the pre-fix order did) left ⌘Enter approve / ⌘⇧D decline dead the
      // moment the panel opened. This mirrors useDoctorShortcutsExtended and
      // the hook docstring ("Callers may retain explicit Escape or
      // modifier-key actions").

      // ⌘/Ctrl + Enter: Approve
      if (isMod && event.key === "Enter") {
        event.preventDefault()
        onApprove?.()
        return
      }

      // ⌘/Ctrl + Shift + D: Decline
      if (isMod && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault()
        onDecline?.()
        return
      }

      // ⌘/Ctrl + →: Next case
      if (isMod && event.key === "ArrowRight") {
        event.preventDefault()
        onNext?.()
        return
      }

      // ⌘/Ctrl + ←: Previous case
      if (isMod && event.key === "ArrowLeft") {
        event.preventDefault()
        onPrevious?.()
        return
      }

      // ⌘/Ctrl + N: Add note
      if (isMod && event.key === "n") {
        event.preventDefault()
        onNote?.()
        return
      }

      // Escape: Close dialogs (allowed anywhere, including inputs)
      if (event.key === "Escape") {
        onEscape?.()
        return
      }

      // Unmodified single-key shortcuts must never win over typing, caret
      // movement, or a control's native keyboard behaviour.
      if (isInteractiveTarget) return

      // Vim-style J/K (no modifier): Next / Previous case
      if (!isMod && !event.shiftKey && !event.altKey) {
        if (event.key === "j") {
          event.preventDefault()
          onNext?.()
          return
        }
        if (event.key === "k") {
          event.preventDefault()
          onPrevious?.()
          return
        }
      }
    },
    [disabled, onApprove, onDecline, onNext, onPrevious, onNote, onEscape]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Keyboard shortcut hint component data
 */
export const DOCTOR_SHORTCUTS = [
  { keys: ["⌘", "Enter"], label: "Approve", description: "Approve current case" },
  { keys: ["⌘", "Shift", "D"], label: "Decline", description: "Open decline dialog" },
  { keys: ["J"], label: "Next", description: "Go to next case" },
  { keys: ["K"], label: "Previous", description: "Go to previous case" },
  { keys: ["⌘", "→"], label: "Next (alt)", description: "Go to next case" },
  { keys: ["⌘", "←"], label: "Previous (alt)", description: "Go to previous case" },
  { keys: ["⌘", "N"], label: "Note", description: "Focus clinical notes" },
  { keys: ["⌘", "Enter"], label: "Submit", description: "Submit current action" },
  { keys: ["Esc"], label: "Close", description: "Close dialogs" },
] as const

/**
 * Extended shortcuts hook with submit support.
 */
interface ExtendedShortcutHandlers extends ShortcutHandlers {
  onSubmit?: () => void
}

export function useDoctorShortcutsExtended({
  onApprove,
  onDecline,
  onNext,
  onPrevious,
  onNote,
  onEscape,
  onSubmit,
  disabled = false,
}: ExtendedShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return

      const isInteractiveTarget = isEditableOrInteractiveKeyboardTarget(event.target)

      const isMod = event.metaKey || event.ctrlKey

      // ⌘/Ctrl + Enter: Submit (works in inputs)
      if (isMod && event.key === "Enter") {
        event.preventDefault()
        onSubmit?.()
        return
      }

      // Allow Escape anywhere
      if (event.key === "Escape") {
        onEscape?.()
        return
      }

      // Don't trigger other shortcuts when typing in inputs
      if (isInteractiveTarget) return

      // ⌘/Ctrl + Enter: Approve
      if (isMod && event.key === "Enter") {
        event.preventDefault()
        onApprove?.()
        return
      }

      // ⌘/Ctrl + Shift + D: Decline
      if (isMod && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault()
        onDecline?.()
        return
      }

      // ⌘/Ctrl + →: Next case
      if (isMod && event.key === "ArrowRight") {
        event.preventDefault()
        onNext?.()
        return
      }

      // ⌘/Ctrl + ←: Previous case
      if (isMod && event.key === "ArrowLeft") {
        event.preventDefault()
        onPrevious?.()
        return
      }

      // ⌘/Ctrl + N: Add note
      if (isMod && event.key === "n") {
        event.preventDefault()
        onNote?.()
        return
      }

      // Vim-style J/K (no modifier): Next / Previous case
      if (!isMod && !event.shiftKey && !event.altKey) {
        if (event.key === "j") {
          event.preventDefault()
          onNext?.()
          return
        }
        if (event.key === "k") {
          event.preventDefault()
          onPrevious?.()
          return
        }
      }
    },
    [disabled, onApprove, onDecline, onNext, onPrevious, onNote, onEscape, onSubmit]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
