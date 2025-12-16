/**
 * Error Tracking - Re-exports from lib/observability/error-tracking.ts
 */
export {
  captureException,
  captureMessage,
  addBreadcrumb,
  getBreadcrumbs,
  clearBreadcrumbs,
  setUser,
  getUser,
  handleReactError,
  withErrorTracking,
  setupGlobalErrorHandlers,
} from '../../../lib/observability/error-tracking'
