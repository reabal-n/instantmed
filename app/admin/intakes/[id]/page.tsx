import Link from "next/link"
import { notFound } from "next/navigation"

import { getAIDraftsForIntake } from "@/app/actions/drafts/draft-retrieval"
import { getPendingDateCorrection } from "@/app/actions/request-date-correction"
import { IntakeDetailClient } from "@/app/doctor/intakes/[id]/intake-detail-client"
import type { DoctorFollowupRow } from "@/app/doctor/intakes/[id]/intake-detail-followups"
import { AdminRequestSummaryButton } from "@/components/admin/admin-request-summary-button"
import { PanelProvider } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import { logClinicianOpenedRequest } from "@/lib/audit/compliance-audit"
import { requireRole } from "@/lib/auth/helpers"
import { getOrCreateMedCertDraftForIntake } from "@/lib/data/documents"
import { getIntakeWithDetails, getNextQueueIntakeId, getPatientIntakes, getPatientNotes } from "@/lib/data/intakes"
import { getCertDeliveryStatus } from "@/lib/data/issued-certificates"
import { getPatientMessagesForIntake } from "@/lib/data/patient-messages"
import { isConsultServiceType } from "@/lib/doctor/service-types"
import { getFeatureFlags } from "@/lib/feature-flags"
import { calculateAge } from "@/lib/format"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { maskMedicare } from "@/lib/utils/format"

export const metadata = { title: "Operator Intake Detail" }

export const dynamic = "force-dynamic"

export default async function AdminIntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const auth = await requireRole(["admin"], { redirectTo: "/admin" })
  const { id } = await params

  const intake = await getIntakeWithDetails(id)
  if (!intake) notFound()

  await logClinicianOpenedRequest(id, "intake", auth.profile.id)

  const serviceType = (intake.service as { type?: string } | undefined)?.type
  const [
    patientHistoryResult,
    aiDrafts,
    nextIntakeId,
    medCertDraft,
    pendingCorrection,
    certDelivery,
    featureFlags,
    patientMessages,
    patientNotes,
  ] = await Promise.all([
    getPatientIntakes(intake.patient.id, { pageSize: 6 }),
    getAIDraftsForIntake(id),
    getNextQueueIntakeId(id),
    serviceType === "med_certs"
      ? getOrCreateMedCertDraftForIntake(id)
      : Promise.resolve(null),
    getPendingDateCorrection(id),
    getCertDeliveryStatus(id),
    getFeatureFlags(),
    getPatientMessagesForIntake(id),
    getPatientNotes(intake.patient.id, undefined, 5),
  ])

  let followups: DoctorFollowupRow[] = []
  if (
    isConsultServiceType(serviceType) &&
    (intake.subtype === "ed" || intake.subtype === "hair_loss")
  ) {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from("intake_followups")
      .select(
        "id, subtype, milestone, due_at, completed_at, skipped, effectiveness_rating, side_effects_reported, side_effects_notes, adherence_days_per_week, patient_notes, doctor_reviewed_at",
      )
      .eq("intake_id", id)
      .order("due_at", { ascending: true })
    followups = (data ?? []) as DoctorFollowupRow[]
  }

  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined
  const previousIntakes = (patientHistoryResult.data ?? [])
    .filter((row: { id: string }) => row.id !== id)
    .slice(0, 5)
  const patientAge = calculateAge(intake.patient.date_of_birth)
  const maskedMedicare = maskMedicare(intake.patient.medicare_number ?? null)
  const serviceLabel = service?.name || service?.short_name || intake.category || "Request"
  const patientLabel = intake.patient.full_name || "Patient"

  return (
    <PanelProvider>
      <IntakeDetailClient
        intake={intake}
        patientAge={patientAge}
        maskedMedicare={maskedMedicare}
        previousIntakes={previousIntakes}
        aiDrafts={aiDrafts}
        nextIntakeId={nextIntakeId}
        draftId={medCertDraft?.id || null}
        pendingCorrection={pendingCorrection}
        followups={followups}
        certDelivery={certDelivery}
        parchmentEnabled={featureFlags.parchment_embedded_prescribing}
        patientMessages={patientMessages}
        patientNotes={patientNotes}
        backHref="/admin#intakes"
        backLabel="Back to work"
        compact
        supplementaryActions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/patients/${intake.patient.id}`}>Patient record</Link>
            </Button>
            <AdminRequestSummaryButton
              intake={intake}
              serviceLabel={serviceLabel}
              patientLabel={patientLabel}
              buttonLabel="Copy summary"
              summaryTitle="Operator request summary"
            />
          </>
        }
      />
    </PanelProvider>
  )
}
