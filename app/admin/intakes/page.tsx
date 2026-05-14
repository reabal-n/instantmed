import { AdminIntakesLedgerClient } from "@/app/admin/intakes/intakes-ledger-client"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { PanelProvider } from "@/components/panels/panel-provider"
import { requireRole } from "@/lib/auth/helpers"
import { STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import { getAllIntakesForAdmin } from "@/lib/data/intakes"
import type { IntakeWithPatient } from "@/types/db"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Intake Ledger",
}

export default async function AdminIntakeLedgerPage() {
  await requireRole(["admin"])

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
          title="Intake ledger"
          description="Search and filter all recent requests when the cockpit is not enough."
          backHref={STAFF_DASHBOARD_HREF}
          backLabel="Staff cockpit"
        />

        <OperatorScrollArea>
          <div id="intakes" className="min-h-[520px]">
            <AdminIntakesLedgerClient allIntakes={intakesResult.data || []} />
          </div>
        </OperatorScrollArea>
      </OperatorPage>
    </PanelProvider>
  )
}
