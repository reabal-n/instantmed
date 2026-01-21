"use client"

/**
 * Doctor Keyboard Shortcuts Hook
 * 
 * P2 DOCTOR_WORKLOAD_AUDIT: Implements keyboard shortcuts to reduce clicks.
 * Saves ~8 minutes per 100 cases.
 * 
 * Shortcuts:
 * - ⌘/Ctrl + A: Approve current case
 * - ⌘/Ctrl + D: Open decline dialog
 * - ⌘/Ctrl + →: Navigate to next case in queue
 * - ⌘/Ctrl + ←: Navigate to previous case
 * - ⌘/Ctrl + N: Add clinical note
 * - Escape: Close dialogs
 */

import { useEffect, useCallback } from "react"

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

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape in inputs
        if (event.key === "Escape" && onEscape) {
          onEscape()
          return
        }
        return
      }

      const isMod = event.metaKey || event.ctrlKey

      // ⌘/Ctrl + A: Approve
      if (isMod && event.key === "a") {
        event.preventDefault()
        onApprove?.()
        return
      }

      // ⌘/Ctrl + D: Decline
      if (isMod && event.key === "d") {
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

      // Escape: Close dialogs
      if (event.key === "Escape") {
        onEscape?.()
        return
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
  { keys: ["⌘", "A"], label: "Approve", description: "Approve current case" },
  { keys: ["⌘", "D"], label: "Decline", description: "Open decline dialog" },
  { keys: ["⌘", "→"], label: "Next", description: "Go to next case" },
  { keys: ["⌘", "←"], label: "Previous", description: "Go to previous case" },
  { keys: ["⌘", "N"], label: "Note", description: "Focus clinical notes" },
  { keys: ["⌘", "K"], label: "Commands", description: "Open command palette" },
  { keys: ["⌘", "Enter"], label: "Submit", description: "Submit current action" },
  { keys: ["Esc"], label: "Close", description: "Close dialogs" },
] as const

/**
 * Extended shortcuts hook with command palette support
 */
interface ExtendedShortcutHandlers extends ShortcutHandlers {
  onCommandPalette?: () => void
  onSubmit?: () => void
}

export function useDoctorShortcutsExtended({
  onApprove,
  onDecline,
  onNext,
  onPrevious,
  onNote,
  onEscape,
  onCommandPalette,
  onSubmit,
  disabled = false,
}: ExtendedShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return

      const target = event.target as HTMLElement
      const isInput = 
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      const isMod = event.metaKey || event.ctrlKey

      // ⌘/Ctrl + K: Command palette (always available)
      if (isMod && event.key === "k") {
        event.preventDefault()
        onCommandPalette?.()
        return
      }

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
      if (isInput) return

      // ⌘/Ctrl + A: Approve
      if (isMod && event.key === "a") {
        event.preventDefault()
        onApprove?.()
        return
      }

      // ⌘/Ctrl + D: Decline
      if (isMod && event.key === "d") {
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
    },
    [disabled, onApprove, onDecline, onNext, onPrevious, onNote, onEscape, onCommandPalette, onSubmit]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
