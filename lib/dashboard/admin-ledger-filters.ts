import type {
  AdminIntakeStatusFilterValue,
  AdminWorkLaneFilterValue,
} from "@/lib/dashboard/admin-work-lanes"
import {
  CLINICAL_HANDOFF_STATUSES,
  DONE_WORK_STATUSES,
  RECOVERY_WORK_STATUSES,
} from "@/lib/dashboard/admin-work-lanes"
import type { AdminServiceFilterValue } from "@/lib/services/service-presentation"

export const ADMIN_LEDGER_QUICK_FILTER_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "awaiting_script", label: "Awaiting script" },
  { value: "failed_payment", label: "Failed payment" },
  { value: "refunded", label: "Refunded" },
  { value: "refund_failed", label: "Refund failed" },
] as const

export type AdminLedgerQuickFilterValue =
  (typeof ADMIN_LEDGER_QUICK_FILTER_OPTIONS)[number]["value"]

const QUICK_FILTER_VALUES = new Set<string>(
  ADMIN_LEDGER_QUICK_FILTER_OPTIONS.map(({ value }) => value),
)

const SERVICE_CATEGORY: Record<Exclude<AdminServiceFilterValue, "all">, string> = {
  med_certs: "medical_certificate",
  repeat_rx: "prescription",
  consults: "consult",
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeAdminLedgerQuickFilters(
  values: readonly string[],
): AdminLedgerQuickFilterValue[] {
  return Array.from(new Set(values.map((value) => value === "express" ? "priority" : value)))
    .filter((value): value is AdminLedgerQuickFilterValue => QUICK_FILTER_VALUES.has(value))
}

/**
 * Keep PostgREST filter punctuation out of the value embedded in `.or(...)`.
 * Unicode letters/numbers remain searchable; whitespace is normalized and the
 * term is bounded so a shared URL cannot create an unbounded filter payload.
 */
export function sanitizeAdminLedgerSearchTerm(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}@._+\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96)
}

export function getAdminLedgerServiceCategory(
  value: AdminServiceFilterValue | undefined,
): string | null {
  if (!value || value === "all") return null
  return SERVICE_CATEGORY[value]
}

export function getAdminLedgerWorkLaneStatuses(
  value: AdminWorkLaneFilterValue | undefined,
): readonly string[] | null {
  switch (value) {
    case "clinical":
      return CLINICAL_HANDOFF_STATUSES
    case "recovery":
      return RECOVERY_WORK_STATUSES
    case "done":
      return DONE_WORK_STATUSES
    default:
      return null
  }
}

export function getAdminLedgerStatus(
  value: AdminIntakeStatusFilterValue | undefined,
): string | null {
  return !value || value === "all" ? null : value
}

// Phone is encrypted without a deterministic lookup index. Do not advertise or
// perform plaintext phone search until a keyed, queryable search token exists.
export const ADMIN_LEDGER_PATIENT_SEARCH_FIELDS = [
  "full_name",
  "email",
  "suburb",
  "state",
] as const

export function buildAdminLedgerSearchOr(
  searchTerm: string,
  patientIds: readonly string[] = [],
): string {
  const clauses = [`reference_number.ilike.*${searchTerm}*`]
  if (UUID_RE.test(searchTerm)) clauses.push(`id.eq.${searchTerm}`)
  if (patientIds.length > 0) clauses.push(`patient_id.in.(${patientIds.join(",")})`)
  return clauses.join(",")
}
