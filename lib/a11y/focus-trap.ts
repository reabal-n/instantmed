/**
 * Focus Trap Utilities
 * 
 * Traps focus within a container for modal dialogs and overlays.
 * Essential for accessibility compliance.
 */

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  return Array.from(container.querySelectorAll(focusableSelectors))
    .filter((el) => {
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    }) as HTMLElement[]
}

/**
 * Create a focus trap for a container element
 */
export function createFocusTrap(container: HTMLElement) {
  let previousActiveElement: Element | null = null

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements(container)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      // Shift + Tab: move focus backwards
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab: move focus forwards
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  return {
    activate() {
      previousActiveElement = document.activeElement
      document.addEventListener('keydown', handleKeyDown)
      
      // Focus first focusable element
      const focusableElements = getFocusableElements(container)
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    },
    
    deactivate() {
      document.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus to previous element
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus()
      }
    },
  }
}

/**
 * Handle escape key to close modals
 */
export function handleEscapeKey(onEscape: () => void) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}

/**
 * Announce content to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.createElement('div')
  announcer.setAttribute('aria-live', priority)
  announcer.setAttribute('aria-atomic', 'true')
  announcer.setAttribute('role', priority === 'assertive' ? 'alert' : 'status')
  announcer.className = 'sr-only'
  announcer.textContent = message
  
  document.body.appendChild(announcer)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcer)
  }, 1000)
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get animation duration based on user preferences
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs
}
