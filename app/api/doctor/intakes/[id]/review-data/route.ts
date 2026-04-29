import { NextRequest, NextResponse } from "next/server"

import { getAIDraftsForIntake } from "@/app/actions/drafts/draft-retrieval"
import { logClinicianOpenedRequest } from "@/lib/audit/compliance-audit"
import { requireApiRole } from "@/lib/auth/helpers"
import { getOrCreateMedCertDraftForIntake } from "@/lib/data/documents"
import { getIntakeWithDetails, getNextQueueIntakeId, getPatientIntakes } from "@/lib/data/intakes"
import { getCertificateForIntake } from "@/lib/data/issued-certificates"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  if (!UUID_RE.test(intakeId)) {
    return NextResponse.json({ error: "Invalid intake ID" }, { status: 400 })
  }

  // Auth + role check (defense-in-depth - middleware also protects /api/doctor/*)
  const auth = await requireApiRole(["doctor", "admin"])
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch intake details
  const intake = await getIntakeWithDetails(intakeId)
  if (!intake) {
    return NextResponse.json({ error: "Intake not found" }, { status: 404 })
  }

  // Compliance audit logging - fire-and-forget, don't block data fetch
  logClinicianOpenedRequest(intakeId, "intake", auth.profile.id).catch(() => {})

  // Determine service type for conditional fetches
  const serviceType = (intake.service as { type?: string } | undefined)?.type

  // Parallel fetches
  const [aiDrafts, nextIntakeId, medCertDraft, certificate, patientHistory] = await Promise.all([
    getAIDraftsForIntake(intakeId),
    getNextQueueIntakeId(intakeId),
    serviceType === "med_certs"
      ? getOrCreateMedCertDraftForIntake(intakeId)
      : Promise.resolve(null),
    serviceType === "med_certs" && (intake.status === "approved" || intake.status === "completed")
      ? getCertificateForIntake(intakeId)
      : Promise.resolve(null),
    getPatientIntakes(intake.patient.id, { pageSize: 6 }),
  ])

  const previousIntakes = patientHistory.data.filter((row) => row.id !== intakeId).slice(0, 5)

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

  const maskedMedicare = intake.patient.medicare_number ?? "Not provided"

  return NextResponse.json({
    intake,
    patientAge,
    maskedMedicare,
    aiDrafts,
    nextIntakeId,
    previousIntakes,
    previousIntakeCount: previousIntakes.length,
    draftId: medCertDraft?.id || null,
    certificate: certificate ? {
      id: certificate.id,
      email_sent_at: certificate.email_sent_at ?? null,
      email_opened_at: certificate.email_opened_at ?? null,
      resend_count: certificate.resend_count ?? 0,
    } : null,
  })
}
