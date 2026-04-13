// ============================================
// SHARED UTILITY TYPES
// ============================================
// Types used across patient/, doctor/, admin/, and lib/ domains.
// Import from "@/types/shared" — do NOT duplicate these.

/**
 * Standard return type for server actions.
 * All server actions should return this shape.
 *
 * @example
 * ```ts
 * async function myAction(): Promise<ActionResult<{ id: string }>> {
 *   return { success: true, data: { id: "123" } }
 * }
 * ```
 */
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  /** Field-level validation errors (e.g. from Zod) */
  fieldErrors?: Record<string, string>
}

/**
 * Cursor-based pagination info for analytics/time-series queries.
 * Used by doctor analytics dashboard.
 */
export interface CursorPaginationInfo {
  days: number
  hasMore: boolean
  nextCursor: string | null
  totalInRange: number
  pageSize: number
}

/**
 * Offset-based pagination info for list/table queries.
 * Used by doctor queue, admin tables, patient lists.
 */
export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
}
