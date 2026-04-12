"use client"

/**
 * Keyboard Navigation Hook for Request Flow
 * 
 * Provides keyboard shortcuts:
 * - Enter: Submit/Continue (when not in textarea/input)
 * - Escape: Go back
 * - Arrow keys: Navigate options (future)
 */

import { useEffect, useCallback } from "react"

interface UseKeyboardNavigationOptions {
  onNext?: () => void
  onBack?: () => void
  enabled?: boolean
  /** Prevent Enter from triggering when focused on form elements */
  preventFormSubmit?: boolean
}

export function useKeyboardNavigation({
  onNext,
  onBack,
  enabled = true,
  preventFormSubmit = true,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const target = event.target as HTMLElement
    const tagName = target.tagName.toLowerCase()
    const isFormElement = tagName === 'input' || tagName === 'textarea' || tagName === 'select'
    const isButton = tagName === 'button'
    const isContentEditable = target.isContentEditable

    // Escape - always go back (unless in modal that handles its own escape)
    if (event.key === 'Escape' && onBack) {
      // Don't interfere with dropdowns or modals
      const isInModal = target.closest('[role="dialog"]')
      const isInDropdown = target.closest('[role="listbox"], [role="menu"]')
      
      if (!isInModal && !isInDropdown) {
        event.preventDefault()
        onBack()
      }
      return
    }

    // Enter - continue/submit
    if (event.key === 'Enter' && onNext) {
      // Allow Enter in textareas (for multiline input)
      if (tagName === 'textarea') return
      
      // Allow Enter on buttons (they have their own behavior)
      if (isButton) return
      
      // Allow content editable
      if (isContentEditable) return
      
      // Prevent form submission on inputs if enabled
      if (preventFormSubmit && isFormElement) {
        // Only trigger next if it's an input and user pressed Enter
        // This allows "submit on Enter" behavior for single-line inputs
        if (tagName === 'input') {
          const inputType = (target as HTMLInputElement).type
          // Allow Enter to trigger next for text-like inputs
          if (['text', 'email', 'tel', 'number', 'search', 'url', 'date'].includes(inputType)) {
            event.preventDefault()
            onNext()
          }
        }
        return
      }
      
      // Not in a form element - trigger next
      event.preventDefault()
      onNext()
    }
  }, [enabled, onNext, onBack, preventFormSubmit])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
