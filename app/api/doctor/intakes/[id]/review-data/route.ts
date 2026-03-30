import { NextRequest, NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireApiRole } from "@/lib/auth"
import { getIntakeWithDetails, getNextQueueIntakeId } from "@/lib/data/intakes"
import { getOrCreateMedCertDraftForIntake } from "@/lib/data/documents"
import { getAIDraftsForIntake } from "@/app/actions/draft-approval"
import { logClinicianOpenedRequest } from "@/lib/audit/compliance-audit"
import { getCertificateForIntake } from "@/lib/data/issued-certificates"

/**
 * GET /api/doctor/intakes/[id]/review-data
 *
 * Returns all data needed by the IntakeReviewPanel (slide-over from queue).
 * Auth: doctor or admin only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

  const { id: intakeId } = await params

  // Auth + role check (defense-in-depth — middleware also protects /api/doctor/*)
  const auth = await requireApiRole(["doctor", "admin"])
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch intake details
  const intake = await getIntakeWithDetails(intakeId)
  if (!intake) {
    return NextResponse.json({ error: "Intake not found" }, { status: 404 })
  }

  // Compliance audit logging
  await logClinicianOpenedRequest(intakeId, "intake", auth.profile.id)

  // Determine service type for conditional fetches
  const serviceType = (intake.service as { type?: string } | undefined)?.type

  // Parallel fetches
  const [aiDrafts, nextIntakeId, medCertDraft, certificate] = await Promise.all([
    getAIDraftsForIntake(intakeId),
    getNextQueueIntakeId(intakeId),
    serviceType === "med_certs"
      ? getOrCreateMedCertDraftForIntake(intakeId)
      : Promise.resolve(null),
    serviceType === "med_certs" && (intake.status === "approved" || intake.status === "completed")
      ? getCertificateForIntake(intakeId)
      : Promise.resolve(null),
  ])

  // Compute patient age
  let patientAge: number | null = null
  if (intake.patient.date_of_birth) {
    const birthDate = new Date(intake.patient.date_of_birth)
    const today = new Date()
    patientAge = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      patientAge--
    }
  }

  // Mask Medicare number
  let maskedMedicare = "Not provided"
  if (intake.patient.medicare_number) {
    const cleaned = intake.patient.medicare_number.replace(/\s/g, "")
    maskedMedicare =
      cleaned.length >= 6
        ? `${cleaned.slice(0, 4)} •••• ${cleaned.slice(-2)}`
        : intake.patient.medicare_number
  }

  return NextResponse.json({
    intake,
    patientAge,
    maskedMedicare,
    aiDrafts,
    nextIntakeId,
    draftId: medCertDraft?.id || null,
    certificate: certificate ? {
      id: certificate.id,
      email_sent_at: certificate.email_sent_at ?? null,
      email_opened_at: certificate.email_opened_at ?? null,
      resend_count: certificate.resend_count ?? 0,
    } : null,
  })
}
