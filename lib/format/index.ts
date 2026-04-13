/**
 * Format utilities barrel export.
 *
 * Date/currency helpers are re-exported directly.
 * Intake and service formatters have a `formatServiceType` name collision,
 * so import those from their specific submodules:
 *   - "@/lib/format/intake" (intake status labels, singular service names)
 *   - "@/lib/format/service" (analytics/plural service names)
 */

export {
  addDays,
  calculateAge,
  formatAge,
  formatAUD,
  formatCurrency,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatMinutes,
  formatRelative,
  formatShortDate,
  formatShortDateSafe,
  formatTimeAgo,
} from "./dates"
export { formatIntakeStatus } from "./intake"
