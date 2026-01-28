/**
 * Toast Helpers
 * 
 * Consistent toast messages across the application.
 * Follows brand voice: calm, professional, concise.
 */

import { toast, ExternalToast } from "sonner"

type ToastOptions = ExternalToast

/**
 * Success toasts - for completed actions
 */
export const toastSuccess = {
  saved: (item = "Changes") => 
    toast.success(`${item} saved`),
  
  created: (item: string) => 
    toast.success(`${item} created`),
  
  deleted: (item: string) => 
    toast.success(`${item} deleted`),
  
  updated: (item = "Changes") => 
    toast.success(`${item} updated`),
  
  sent: (item = "Message") => 
    toast.success(`${item} sent`),
  
  copied: (item = "Copied to clipboard") => 
    toast.success(item),
  
  approved: (item = "Request") => 
    toast.success(`${item} approved`),
  
  submitted: (item = "Form") => 
    toast.success(`${item} submitted`),
    
  custom: (message: string, options?: ToastOptions) => 
    toast.success(message, options),
}

/**
 * Error toasts - for failures
 */
export const toastError = {
  generic: () => 
    toast.error("Something went wrong. Please try again."),
  
  network: () => 
    toast.error("Connection issue. Check your internet and try again."),
  
  unauthorized: () => 
    toast.error("You don't have permission to do this."),
  
  notFound: (item = "Item") => 
    toast.error(`${item} not found.`),
  
  validation: (field?: string) => 
    toast.error(field ? `Please check ${field}` : "Please check your input."),
  
  save: (item = "Changes") => 
    toast.error(`Couldn't save ${item.toLowerCase()}. Please try again.`),
  
  load: (item = "data") => 
    toast.error(`Couldn't load ${item}. Please refresh.`),
  
  timeout: () => 
    toast.error("Request timed out. Please try again."),
  
  rateLimit: () => 
    toast.error("Too many requests. Please wait a moment."),
    
  custom: (message: string, options?: ToastOptions) => 
    toast.error(message, options),
}

/**
 * Info toasts - for neutral information
 */
export const toastInfo = {
  loading: (action = "Loading") => 
    toast.loading(`${action}...`),
  
  processing: () => 
    toast.loading("Processing..."),
  
  saving: () => 
    toast.loading("Saving..."),
  
  pending: (action: string) => 
    toast.info(`${action} is pending`),
  
  offline: () => 
    toast.info("You're offline. Changes will sync when connected."),
  
  custom: (message: string, options?: ToastOptions) => 
    toast.info(message, options),
}

/**
 * Warning toasts - for cautionary messages
 */
export const toastWarning = {
  unsavedChanges: () => 
    toast.warning("You have unsaved changes."),
  
  sessionExpiring: (minutes: number) => 
    toast.warning(`Session expires in ${minutes} minute${minutes > 1 ? "s" : ""}.`),
  
  lowStock: (item: string) => 
    toast.warning(`${item} is running low.`),
  
  custom: (message: string, options?: ToastOptions) => 
    toast.warning(message, options),
}

/**
 * Promise toast - for async operations
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
): void {
  toast.promise(promise, messages)
}

/**
 * Dismissible toast with action
 */
export function toastWithAction(
  message: string,
  action: {
    label: string
    onClick: () => void
  },
  options?: ToastOptions
) {
  return toast(message, {
    ...options,
    action: {
      label: action.label,
      onClick: action.onClick,
    },
  })
}

/**
 * Undo toast - common pattern for deletions
 */
export function toastUndo(
  message: string,
  onUndo: () => void,
  duration = 5000
) {
  return toast(message, {
    duration,
    action: {
      label: "Undo",
      onClick: onUndo,
    },
  })
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss()
}

/**
 * Dismiss specific toast
 */
export function dismissToast(id: string | number) {
  toast.dismiss(id)
}
