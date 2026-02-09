import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { logger } from "@/lib/observability/logger"
import { checkCertificateRateLimit } from "@/lib/security/rate-limit"
import { generateCertificateNumber, generateVerificationCode } from "@/lib/pdf/med-cert-render"
import { generateIdempotencyKey } from "@/lib/data/issued-certificates"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: intakeId } = await params
  
  logger.info("APPROVE_API_START", { intakeId })

  try {
    const authUser = await getAuthenticatedUserWithProfile()
    if (!authUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    
    const doctor = authUser.profile
    if (!["doctor", "admin"].includes(doctor.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const rateLimit = await checkCertificateRateLimit(doctor.id)
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 })
    }

    if (!doctor.provider_number || !doctor.ahpra_number) {
      return NextResponse.json({ ok: false, error: "Certificate credentials not configured" }, { status: 400 })
    }

    // SECURITY: Require AHPRA verification before approving — unverified doctors cannot issue certificates
    if (doctor.role === "doctor" && !doctor.ahpra_verified) {
      logger.warn("APPROVE_BLOCKED_UNVERIFIED", { intakeId, doctorId: doctor.id })
      return NextResponse.json({ ok: false, error: "AHPRA verification required before approving requests" }, { status: 403 })
    }

    const supabase = createServiceRoleClient()

    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, status, payment_status, claimed_by, patient:profiles!patient_id(id, full_name, email, date_of_birth), answers:intake_answers(answers)")
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ ok: false, error: "Intake not found" }, { status: 404 })
    }

    const APPROVABLE_STATES = ["paid", "in_review"]
    if (!APPROVABLE_STATES.includes(intake.status)) {
      if (intake.status === "approved") {
        return NextResponse.json({ ok: true, alreadyApproved: true })
      }
      return NextResponse.json({ ok: false, error: "Cannot approve intake in " + intake.status + " state" }, { status: 400 })
    }

    if (intake.payment_status !== "paid") {
      return NextResponse.json({ ok: false, error: "Payment not completed" }, { status: 400 })
    }

    const patientData = intake.patient as unknown as { id: string; full_name: string; email: string; date_of_birth: string }[] | { id: string; full_name: string; email: string; date_of_birth: string }; const patient = Array.isArray(patientData) ? patientData[0] : patientData
    if (patient.id === doctor.id) {
      return NextResponse.json({ ok: false, error: "Cannot approve your own request" }, { status: 403 })
    }

    if (intake.claimed_by !== doctor.id) {
      const { data: claimResult, error: claimError } = await supabase.rpc("claim_intake_for_review", {
        p_intake_id: intakeId,
        p_doctor_id: doctor.id,
        p_force: false,
      })
      const claim = Array.isArray(claimResult) ? claimResult[0] : claimResult
      if (claimError || !claim?.success) {
        return NextResponse.json({ ok: false, error: claim?.error_message || "Failed to claim intake" }, { status: 409 })
      }
    }

    const answers = (intake.answers as { answers?: Record<string, unknown> })?.answers || {}
    const certType = (answers.cert_type as string) || "work"
    const today = new Date().toISOString().split("T")[0]
    
    const { data: draft } = await supabase
      .from("document_drafts")
      .select("data")
      .eq("request_id", intakeId)
      .eq("type", "med_cert")
      .maybeSingle()
    
    const draftData = draft?.data as { date_from?: string; date_to?: string } | null
    const startDate = draftData?.date_from || today
    const endDate = draftData?.date_to || today

    const certificateNumber = generateCertificateNumber()
    const verificationCode = generateVerificationCode()
    const idempotencyKey = generateIdempotencyKey(intakeId, doctor.id, today)

    const { data: existingCert } = await supabase
      .from("issued_certificates")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle()

    if (existingCert) {
      return NextResponse.json({ ok: true, certificateId: existingCert.id, alreadyApproved: true })
    }

    const { data: certificate, error: certError } = await supabase
      .from("issued_certificates")
      .insert({
        intake_id: intakeId,
        certificate_number: certificateNumber,
        verification_code: verificationCode,
        idempotency_key: idempotencyKey,
        certificate_type: certType,
        status: "valid",
        issue_date: today,
        start_date: startDate,
        end_date: endDate,
        patient_id: patient.id,
        patient_name: patient.full_name,
        patient_dob: patient.date_of_birth,
        doctor_id: doctor.id,
        doctor_name: doctor.full_name,
        doctor_nominals: null,
        doctor_provider_number: doctor.provider_number,
        doctor_ahpra_number: doctor.ahpra_number,
        template_config_snapshot: {},
        clinic_identity_snapshot: {},
        storage_path: "pending:" + intakeId,
      })
      .select("id")
      .single()

    if (certError || !certificate) {
      logger.error("APPROVE_API_CERT_FAILED", { intakeId, error: certError?.message })
      return NextResponse.json({ ok: false, error: "Failed to create certificate" }, { status: 500 })
    }

    await supabase.from("email_outbox").insert({
      email_type: "med_cert_patient",
      to_email: patient.email,
      to_name: patient.full_name,
      subject: "Your Medical Certificate is Ready",
      status: "pending",
      provider: "resend",
      intake_id: intakeId,
      patient_id: patient.id,
      certificate_id: certificate.id,
      metadata: { needs_pdf_generation: true },
    })

    await supabase.from("intakes").update({ 
      status: "approved", 
      reviewed_by: doctor.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", intakeId)

    revalidatePath("/doctor/intakes/" + intakeId)
    revalidatePath("/doctor/queue")
    revalidatePath("/patient/intakes/" + intakeId)

    logger.info("APPROVE_API_SUCCESS", { intakeId, certificateId: certificate.id })
    return NextResponse.json({ ok: true, certificateId: certificate.id })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error("APPROVE_API_ERROR", { intakeId, error: msg })
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}
