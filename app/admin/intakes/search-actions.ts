"use server"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import {
  type AdminLedgerQuickFilterValue,
  normalizeAdminLedgerQuickFilters,
  sanitizeAdminLedgerSearchTerm,
} from "@/lib/dashboard/admin-ledger-filters"
import {
  ADMIN_INTAKE_STATUS_FILTER_OPTIONS,
  ADMIN_WORK_LANE_FILTER_OPTIONS,
  type AdminIntakeStatusFilterValue,
  type AdminWorkLaneFilterValue,
} from "@/lib/dashboard/admin-work-lanes"
import { getAllIntakesForAdmin } from "@/lib/data/intakes"
import { buildCaseRowAttribution, type CaseRowAttribution } from "@/lib/operator/cases/case-attribution"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import {
  ADMIN_SERVICE_FILTER_OPTIONS,
  type AdminServiceFilterValue,
} from "@/lib/services/service-presentation"
import type { IntakeWithPatient } from "@/types/db"

interface SearchAdminLedgerInput {
  query: string
  page?: number
  pageSize?: number
  service?: string
  status?: string
  workLane?: string
  chips?: string[]
}

type AdminLedgerSearchRow = IntakeWithPatient & {
  attribution?: CaseRowAttribution | null
}

export interface AdminLedgerSearchData {
  data: AdminLedgerSearchRow[]
  total: number | null
  page: number
  pageSize: number
  degraded: boolean
  patientSearchUnavailable: boolean
  patientSearchSaturated: boolean
}

export type SearchAdminLedgerResult =
  | { success: true; data: AdminLedgerSearchData }
  | { success: false; error: string }

function parseStatus(value: unknown): AdminIntakeStatusFilterValue | undefined {
  return typeof value === "string"
    && ADMIN_INTAKE_STATUS_FILTER_OPTIONS.some((option) => option.value === value)
    ? value as AdminIntakeStatusFilterValue
    : undefined
}

function parseService(value: unknown): AdminServiceFilterValue | undefined {
  return typeof value === "string"
    && ADMIN_SERVICE_FILTER_OPTIONS.some((option) => option.value === value)
    ? value as AdminServiceFilterValue
    : undefined
}

function parseWorkLane(value: unknown): AdminWorkLaneFilterValue | undefined {
  return typeof value === "string"
    && ADMIN_WORK_LANE_FILTER_OPTIONS.some((option) => option.value === value)
    ? value as AdminWorkLaneFilterValue
    : undefined
}

function parseChips(value: unknown): AdminLedgerQuickFilterValue[] {
  return Array.isArray(value)
    ? normalizeAdminLedgerQuickFilters(value.filter((chip): chip is string => typeof chip === "string"))
    : []
}

/**
 * Search the request ledger without persisting patient or request identifiers
 * in the address bar. The authenticated role is re-derived here so support
 * always receives the masked projection owned by `getAllIntakesForAdmin`.
 */
export async function searchAdminLedgerAction(
  input: SearchAdminLedgerInput,
): Promise<SearchAdminLedgerResult> {
  const auth = await requireRoleOrNull(["admin", "support"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const query = sanitizeAdminLedgerSearchTerm(
    input && typeof input.query === "string" ? input.query : "",
  )
  if (!query) {
    return { success: false, error: "Enter a patient, request reference, email, suburb, or state." }
  }

  const rateLimit = await checkServerActionRateLimit(
    `staff:ledger-search:${auth.profile.id}`,
    "standard",
  )
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error ?? "Too many searches. Please wait and try again." }
  }

  const viewerRole = auth.profile.role === "support" ? "support" : "admin"
  const page = Number.isInteger(input?.page)
    ? Math.min(Math.max(input.page ?? 1, 1), 1000)
    : 1
  const pageSize = Number.isInteger(input?.pageSize)
    ? Math.min(Math.max(input.pageSize ?? 50, 10), 100)
    : 50

  try {
    const result = await getAllIntakesForAdmin({
      viewerRole,
      page,
      pageSize,
      q: query,
      service: parseService(input?.service),
      status: parseStatus(input?.status),
      workLane: parseWorkLane(input?.workLane),
      chips: parseChips(input?.chips),
    })

    return {
      success: true,
      data: {
        ...result,
        data: result.data.map((intake) => ({
          ...intake,
          attribution: viewerRole === "admin"
            ? buildCaseRowAttribution(
                intake as Parameters<typeof buildCaseRowAttribution>[0],
              )
            : null,
        })),
      },
    }
  } catch {
    // Provider errors can contain the raw PostgREST filter. Keep the failure
    // generic so neither logs nor the returned payload echo a search term.
    return { success: false, error: "The request-ledger lookup could not be completed." }
  }
}
