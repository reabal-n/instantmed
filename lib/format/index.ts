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
  formatDate,
  formatDateTime,
  formatDateLong,
  addDays,
  formatShortDate,
  formatShortDateSafe,
  formatRelative,
  formatCurrency,
  calculateAge,
  formatAUD,
  formatTimeAgo,
  formatAge,
  formatMinutes,
} from "./dates"

export { formatIntakeStatus } from "./intake"
