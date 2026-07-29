import { Suspense } from "react"

import {
  AdminIntakesLedgerClient,
  type AdminIntakesLedgerInitialFilters,
} from "@/app/admin/intakes/intakes-ledger-client"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
} from "@/components/operator/operator-page"
import { PanelProvider } from "@/components/panels/panel-provider"
import { requireRole } from "@/lib/auth/helpers"
import { normalizeAdminLedgerQuickFilters } from "@/lib/dashboard/admin-ledger-filters"
import {
  ADMIN_INTAKE_STATUS_FILTER_OPTIONS,
  ADMIN_WORK_LANE_FILTER_OPTIONS,
} from "@/lib/dashboard/admin-work-lanes"
import { STAFF_DASHBOARD_HREF, STAFF_OPS_HREF } from "@/lib/dashboard/routes"
import { getAllIntakesForAdmin } from "@/lib/data/intakes"
import { buildCaseRowAttribution } from "@/lib/operator/cases/case-attribution"
import {
  ADMIN_SERVICE_FILTER_OPTIONS,
  type AdminServiceFilterValue,
} from "@/lib/services/service-presentation"
import type { IntakeWithPatient } from "@/types/db"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Request Ledger",
}

type SearchParams = {
  page?: string | string[]
  pageSize?: string | string[]
  q?: string | string[]
  service?: string | string[]
  status?: string | string[]
  workLane?: string | string[]
  chips?: string | string[]
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function isAdminStatusFilter(value: string | undefined): value is NonNullable<AdminIntakesLedgerInitialFilters["status"]> {
  return ADMIN_INTAKE_STATUS_FILTER_OPTIONS.some((option) => option.value === value)
}

function isAdminServiceFilter(value: string | undefined): value is AdminServiceFilterValue {
  return ADMIN_SERVICE_FILTER_OPTIONS.some((option) => option.value === value)
}

function isAdminWorkLaneFilter(value: string | undefined): value is NonNullable<AdminIntakesLedgerInitialFilters["workLane"]> {
  return ADMIN_WORK_LANE_FILTER_OPTIONS.some((option) => option.value === value)
}

function parseLedgerFilters(params: SearchParams): AdminIntakesLedgerInitialFilters {
  const status = firstParam(params.status)
  const service = firstParam(params.service)
  const workLane = firstParam(params.workLane)
  const q = firstParam(params.q)?.trim()
  const chips = normalizeAdminLedgerQuickFilters(
    (firstParam(params.chips) ?? "").split(",").filter(Boolean),
  )

  return {
    q: q || undefined,
    service: isAdminServiceFilter(service) ? service : undefined,
    status: isAdminStatusFilter(status) ? status : undefined,
    workLane: isAdminWorkLaneFilter(workLane) ? workLane : undefined,
    chips,
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export default async function AdminIntakeLedgerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // Open to support for bounded payment recovery actions. Support receives a
  // masked ledger projection and cannot open the clinical review panel.
  const { profile } = await requireRole(["admin", "support"])
  const params = await searchParams
  const initialFilters = parseLedgerFilters(params)
  const page = parsePositiveInteger(firstParam(params.page), 1)
  const pageSize = Math.min(100, Math.max(10, parsePositiveInteger(firstParam(params.pageSize), 50)))

  const results = await Promise.allSettled([
    getAllIntakesForAdmin({
      viewerRole: profile.role as "admin" | "support",
      page,
      pageSize,
      q: initialFilters.q,
      service: initialFilters.service,
      status: initialFilters.status,
      workLane: initialFilters.workLane,
      chips: initialFilters.chips,
    }),
  ])

  const intakesResult = results[0].status === "fulfilled"
    ? results[0].value
    : {
        data: [] as IntakeWithPatient[],
        total: null,
        page,
        pageSize,
        degraded: true,
        patientSearchUnavailable: false,
      }

  // Classify acquisition source SERVER-side and ship only the tiny precomputed
  // label per row. Doing this in the client mapper would pull the 10-group
  // classifier (+ the heard-about-us module) into the ledger's first-load JS —
  // the exact bundle-budget class this route's gate exists to catch.
  const intakesWithAttribution = intakesResult.data.map((intake) => ({
    ...intake,
    attribution: profile.role === "admin"
      ? buildCaseRowAttribution(
          intake as Parameters<typeof buildCaseRowAttribution>[0],
        )
      : null,
  }))

  return (
    <PanelProvider>
      <OperatorPage>
        <OperatorPageHeader
          title="Request ledger"
          description={
            initialFilters.q || initialFilters.status || initialFilters.service || initialFilters.workLane || initialFilters.chips?.length
              ? "Filtered recent requests from an operator drilldown."
              : "Search, audit, and recover request records when the cockpit is not enough."
          }
          backHref={profile.role === "support" ? STAFF_OPS_HREF : STAFF_DASHBOARD_HREF}
          backLabel={profile.role === "support" ? "Operations" : "Staff cockpit"}
        />

        <OperatorScrollArea>
          <div id="intakes" className="min-h-[520px]">
            <Suspense fallback={null}>
              <AdminIntakesLedgerClient
                rows={intakesWithAttribution}
                total={intakesResult.total}
                page={intakesResult.page}
                pageSize={intakesResult.pageSize}
                degraded={intakesResult.degraded}
                patientSearchUnavailable={intakesResult.patientSearchUnavailable}
                viewerRole={profile.role as "admin" | "support"}
                initialFilters={initialFilters}
              />
            </Suspense>
          </div>
        </OperatorScrollArea>
      </OperatorPage>
    </PanelProvider>
  )
}
