"use client"

import { RefreshCw } from "lucide-react"
import { useState } from "react"

import { refreshPatientParchmentPrescriptionsAction } from "@/app/actions/manual-patient"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { Button } from "@/components/ui/button"
import type { ReviewPrescriptionHistory } from "@/lib/data/review-prescription-history"

interface PrescriptionHistoryCardProps {
  patientId: string
  history?: ReviewPrescriptionHistory
  reload: () => Promise<ReviewPrescriptionHistory | null>
}

export function PrescriptionHistoryCard({ patientId, history, reload }: PrescriptionHistoryCardProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function refresh() {
    setRefreshing(true)
    setMessage(null)
    try {
      const result = history?.canRefresh
        ? await refreshPatientParchmentPrescriptionsAction(patientId)
        : { success: true }
      // Partial provider sync may still have recorded useful prescription rows.
      const refreshed = await reload()
      setMessage(!refreshed
        ? "Could not reload prescription history. Showing the previously loaded records."
        : refreshed.error
          ? refreshed.error
          : result.success
          ? "Prescription history refreshed."
          : result.error || "Could not refresh prescriptions from Parchment.")
    } catch {
      setMessage("Could not refresh prescriptions. Showing the previously loaded records.")
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-2" data-testid="prescription-history">
      <PatientTimeline
        prescriptions={history?.prescriptions ?? []}
        compact
        initialPageSize={3}
        pageStep={5}
        title="Prescribed through InstantMed"
        emptyLabel={history?.error || (history ? "No prescriptions recorded in InstantMed." : "Prescription history has not loaded.")}
      />
      <div className="flex flex-wrap items-center gap-2 px-1">
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden />
          {refreshing ? "Refreshing prescriptions…" : history?.canRefresh ? "Refresh from Parchment" : "Reload history"}
        </Button>
        <p className="text-xs text-muted-foreground">Recorded prescriptions; this does not confirm current use.</p>
      </div>
      {history?.hasMore ? <p className="px-1 text-xs text-muted-foreground">Showing the latest 20 recorded prescriptions. Open the patient record or Parchment for older prescriptions.</p> : null}
      <p role="status" className="px-1 text-xs text-muted-foreground">{message}</p>
    </div>
  )
}
