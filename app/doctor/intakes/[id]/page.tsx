import { notFound } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getIntakeWithDetails, getPatientIntakes, getNextQueueIntakeId } from "@/lib/data/intakes"
import { getCertDeliveryStatus } from "@/lib/data/issued-certificates"
import { getOrCreateMedCertDraftForIntake } from "@/lib/data/documents"
import { IntakeDetailClient } from "./intake-detail-client"
import { logClinicianOpenedRequest } from "@/lib/audit/compliance-audit"
import { getAIDraftsForIntake } from "@/app/actions/draft-approval"
import { getPendingDateCorrection } from "@/app/actions/request-date-correction"
import { getFeatureFlags } from "@/lib/feature-flags"
import { calculateAge } from "@/lib/format"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { DoctorFollowupRow } from "./intake-detail-followups"

export const metadata = { title: "Review Intake" }

export const dynamic = "force-dynamic"

export default async function DoctorIntakeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { id } = await params
  const { action } = await searchParams

  // Layout enforces doctor/admin role - use cached profile
  const { profile } = (await getAuthenticatedUserWithProfile())!

  const intake = await getIntakeWithDetails(id)

  if (!intake) {
    notFound()
  }

  // Compliance audit logging (AUDIT_LOGGING_REQUIREMENTS.md)
  await logClinicianOpenedRequest(id, "intake", profile.id)

  // Fetch patient's previous intakes for history
  const { data: patientHistory } = await getPatientIntakes(intake.patient.id, { pageSize: 6 })
  const previousIntakes = patientHistory.filter((r: { id: string }) => r.id !== id).slice(0, 5)

  // Fetch AI drafts, next intake, cert delivery status in parallel
  const [aiDrafts, nextIntakeId, medCertDraft, pendingCorrection, certDelivery, featureFlags] = await Promise.all([
    getAIDraftsForIntake(id),
    getNextQueueIntakeId(id),
    (intake.service as { type?: string } | undefined)?.type === "med_certs"
      ? getOrCreateMedCertDraftForIntake(id)
      : Promise.resolve(null),
    getPendingDateCorrection(id),
    getCertDeliveryStatus(id),
    getFeatureFlags(),
  ])

  // Phase 3: fetch follow-ups for ED/hair-loss consults
  let followups: DoctorFollowupRow[] = []
  const serviceTypeLocal = (intake.service as { type?: string } | undefined)?.type
  if (
    serviceTypeLocal === "consults" &&
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

  // Mask Medicare number
  const maskMedicare = (medicare: string | null): string => {
    if (!medicare) return "Not provided"
    const cleaned = medicare.replace(/\s/g, "")
    if (cleaned.length < 6) return medicare
    return `${cleaned.slice(0, 4)} •••• ${cleaned.slice(-2)}`
  }

  const patientAge = calculateAge(intake.patient.date_of_birth)
  const maskedMedicare = maskMedicare(intake.patient.medicare_number)

  return (
    <IntakeDetailClient
      intake={intake}
      patientAge={patientAge}
      maskedMedicare={maskedMedicare}
      previousIntakes={previousIntakes}
      initialAction={action}
      aiDrafts={aiDrafts}
      nextIntakeId={nextIntakeId}
      draftId={medCertDraft?.id || null}
      pendingCorrection={pendingCorrection}
      followups={followups}
      certDelivery={certDelivery}
      parchmentEnabled={featureFlags.parchment_embedded_prescribing}
    />
  )
}
