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
import {
  ADMIN_INTAKE_STATUS_FILTER_OPTIONS,
  ADMIN_WORK_LANE_FILTER_OPTIONS,
} from "@/lib/dashboard/admin-work-lanes"
import { STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import { getAllIntakesForAdmin } from "@/lib/data/intakes"
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
  q?: string | string[]
  service?: string | string[]
  status?: string | string[]
  workLane?: string | string[]
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

  return {
    q: q || undefined,
    service: isAdminServiceFilter(service) ? service : undefined,
    status: isAdminStatusFilter(status) ? status : undefined,
    workLane: isAdminWorkLaneFilter(workLane) ? workLane : undefined,
  }
}

export default async function AdminIntakeLedgerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // Open to support so they can see refund work + drill into a case to refund.
  // Page itself shows only ledger metadata; PHI-rich detail (clinical answers,
  // medicare) stays gated on the intake detail surface.
  await requireRole(["admin", "support"])
  const params = await searchParams
  const initialFilters = parseLedgerFilters(params)

  const results = await Promise.allSettled([
    getAllIntakesForAdmin({ page: 1, pageSize: 50 }),
  ])

  const intakesResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: [] as IntakeWithPatient[], total: 0, page: 1, pageSize: 50 }

  return (
    <PanelProvider>
      <OperatorPage>
        <OperatorPageHeader
          title="Request ledger"
          description={
            initialFilters.q || initialFilters.status || initialFilters.service || initialFilters.workLane
              ? "Filtered recent requests from an operator drilldown."
              : "Search, audit, and recover request records when the cockpit is not enough."
          }
          backHref={STAFF_DASHBOARD_HREF}
          backLabel="Staff cockpit"
        />

        <OperatorScrollArea>
          <div id="intakes" className="min-h-[520px]">
            <Suspense fallback={null}>
              <AdminIntakesLedgerClient
                allIntakes={intakesResult.data || []}
                initialFilters={initialFilters}
              />
            </Suspense>
          </div>
        </OperatorScrollArea>
      </OperatorPage>
    </PanelProvider>
  )
}
