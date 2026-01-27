/**
 * Unified Toast Configuration
 * 
 * Standardized toast notifications with consistent styling and duration.
 * Use these helpers instead of calling toast() directly for consistency.
 */

import { toast, ExternalToast } from "sonner"

// Standard durations (in ms)
export const TOAST_DURATION = {
  short: 3000,
  default: 4000,
  long: 6000,
  persistent: Infinity,
} as const

// Default options for all toasts
const defaultOptions: ExternalToast = {
  duration: TOAST_DURATION.default,
}

/**
 * Success toast - for completed actions
 */
export function showSuccess(message: string, options?: ExternalToast) {
  return toast.success(message, { ...defaultOptions, ...options })
}

/**
 * Error toast - for failures
 */
export function showError(message: string, options?: ExternalToast) {
  return toast.error(message, { 
    ...defaultOptions, 
    duration: TOAST_DURATION.long,
    ...options 
  })
}

/**
 * Warning toast - for non-critical issues
 */
export function showWarning(message: string, options?: ExternalToast) {
  return toast.warning(message, { ...defaultOptions, ...options })
}

/**
 * Info toast - for neutral information
 */
export function showInfo(message: string, options?: ExternalToast) {
  return toast.info(message, { ...defaultOptions, ...options })
}

/**
 * Loading toast - for async operations
 * Returns a function to dismiss the toast
 */
export function showLoading(message: string, options?: ExternalToast) {
  const id = toast.loading(message, { 
    ...defaultOptions, 
    duration: TOAST_DURATION.persistent,
    ...options 
  })
  return {
    id,
    dismiss: () => toast.dismiss(id),
    success: (msg: string) => toast.success(msg, { id }),
    error: (msg: string) => toast.error(msg, { id }),
  }
}

/**
 * Promise toast - for async operations with automatic status updates
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) {
  return toast.promise(promise, messages)
}

/**
 * Action toast - with a clickable action button
 */
export function showAction(
  message: string,
  action: {
    label: string
    onClick: () => void
  },
  options?: ExternalToast
) {
  return toast(message, {
    ...defaultOptions,
    action: {
      label: action.label,
      onClick: action.onClick,
    },
    ...options,
  })
}

/**
 * Dismiss all toasts
 */
export function dismissAll() {
  toast.dismiss()
}

/**
 * Dismiss a specific toast by ID
 */
export function dismiss(id: string | number) {
  toast.dismiss(id)
}
