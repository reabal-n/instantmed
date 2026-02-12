/**
 * Toast Configuration
 * 
 * Canonical toast system re-exports from toast-helpers.
 * For new code, prefer importing from "@/lib/ui/toast-helpers" directly.
 */

// Re-export everything from the canonical toast-helpers module
export {
  toastSuccess as showSuccess,
  toastError as showError,
  toastWarning as showWarning,
  toastInfo as showInfo,
  toastPromise as showPromise,
  toastWithAction as showAction,
  toastUndo,
  dismissAllToasts as dismissAll,
  dismissToast as dismiss,
} from "./toast-helpers"

// Standard durations (in ms)
export const TOAST_DURATION = {
  short: 3000,
  default: 4000,
  long: 6000,
  persistent: Infinity,
} as const
