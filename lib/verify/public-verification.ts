import "server-only"

import { logCertificateEvent } from "@/lib/data/issued-certificates"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { normalizeVerificationCode } from "@/lib/utils/code-normalization"
import {
  formatCertificateType,
  formatDoctorName,
  maskPatientName,
  verifyOutcome,
} from "@/lib/verify/certificate"

export interface PublicCertificateVerificationResult {
  valid: boolean
  status?: "revoked" | "superseded"
  message?: string
  certificate?: {
    certificateNumber: string | null
    type: string
    issueDate: string | undefined
    validFrom?: string | null
    validTo?: string | null
    patientName: string
    issuingDoctor: string
    issuingClinic: string
  }
  error?: string
}

export const ISSUED_CERT_SELECT_FIELDS = `
  id,
  certificate_number,
  verification_code,
  certificate_type,
  status,
  issue_date,
  start_date,
  end_date,
  patient_name,
  doctor_name,
  doctor_nominals,
  clinic_identity_snapshot,
  certificate_ref
` as const

export function isValidVerificationCodeFormat(code: string): boolean {
  return (
    /^MC-\d{4}-[A-F0-9]{8}$/.test(code) ||
    /^IM-(WORK|STUDY|CARER)-\d{8}-\d{8}$/.test(code) ||
    /^[A-Z0-9]{6,16}$/.test(code)
  )
}

export async function verifyCertificateCode(
  rawCode: string,
  options: {
    clientIp?: string
    logSuccess?: boolean
    supabase?: ReturnType<typeof createServiceRoleClient>
    userAgent?: string | null
  } = {},
): Promise<PublicCertificateVerificationResult> {
  const code = normalizeVerificationCode(rawCode)
  if (!isValidVerificationCodeFormat(code)) {
    return { valid: false, error: "Invalid verification code format" }
  }

  const supabase = options.supabase ?? createServiceRoleClient()

  const { data: certByVerificationCode } = await supabase
    .from("issued_certificates")
    .select(ISSUED_CERT_SELECT_FIELDS)
    .eq("verification_code", code)
    .maybeSingle()

  let issuedCert = certByVerificationCode

  if (!issuedCert) {
    const { data: certByCertNumber } = await supabase
      .from("issued_certificates")
      .select(ISSUED_CERT_SELECT_FIELDS)
      .eq("certificate_number", code)
      .maybeSingle()

    issuedCert = certByCertNumber
  }

  if (!issuedCert) {
    const { data: certByRef } = await supabase
      .from("issued_certificates")
      .select(ISSUED_CERT_SELECT_FIELDS)
      .eq("certificate_ref", code)
      .maybeSingle()

    issuedCert = certByRef
  }

  if (issuedCert) {
    const outcome = verifyOutcome(issuedCert as never)

    if (outcome.kind === "revoked") {
      return {
        valid: false,
        status: "revoked",
        message: "This certificate has been revoked and is no longer valid.",
      }
    }

    if (outcome.kind === "superseded") {
      return {
        valid: false,
        status: "superseded",
        message:
          "This certificate has been replaced by an updated version. Please request the current certificate from the patient.",
      }
    }

    if (options.logSuccess) {
      void logCertificateEvent(issuedCert.id, "verified", null, "system", {
        ip_address: options.clientIp,
        user_agent: options.userAgent,
      })
    }

    const clinicSnapshot = issuedCert.clinic_identity_snapshot as {
      clinic_name?: string
      trading_name?: string
    } | null
    const clinicName =
      clinicSnapshot?.trading_name || clinicSnapshot?.clinic_name || "InstantMed"

    return {
      valid: true,
      certificate: {
        certificateNumber: issuedCert.certificate_number,
        type: formatCertificateType(issuedCert.certificate_type),
        issueDate: issuedCert.issue_date,
        validFrom: issuedCert.start_date,
        validTo: issuedCert.end_date,
        patientName: maskPatientName(issuedCert.patient_name),
        issuingDoctor: formatDoctorName(issuedCert.doctor_name, issuedCert.doctor_nominals),
        issuingClinic: clinicName,
      },
    }
  }

  return (await checkLegacyTables(supabase, code)) ?? { valid: false }
}

async function checkLegacyTables(
  supabase: ReturnType<typeof createServiceRoleClient>,
  code: string,
): Promise<PublicCertificateVerificationResult | null> {
  const { data: legacyCert } = await supabase
    .from("med_cert_certificates")
    .select(`
      id,
      certificate_number,
      certificate_type,
      created_at,
      patient_name,
      doctor_name,
      date_from,
      date_to
    `)
    .eq("certificate_number", code)
    .maybeSingle()

  if (legacyCert) {
    return {
      valid: true,
      certificate: {
        certificateNumber: legacyCert.certificate_number,
        type: formatCertificateType(legacyCert.certificate_type),
        issueDate: legacyCert.created_at?.split("T")[0],
        validFrom: legacyCert.date_from,
        validTo: legacyCert.date_to,
        patientName: maskPatientName(legacyCert.patient_name),
        issuingDoctor: formatDoctorName(legacyCert.doctor_name, null),
        issuingClinic: "InstantMed",
      },
    }
  }

  const { data: intakeDoc } = await supabase
    .from("intake_documents")
    .select(`
      id,
      certificate_number,
      created_at,
      intake:intakes!intake_id(
        patient:profiles!patient_id(full_name),
        reviewed_by,
        category
      )
    `)
    .eq("certificate_number", code)
    .maybeSingle()

  if (!intakeDoc) return null

  interface IntakeJoin {
    category: string | null
    patient: { full_name: string }[] | { full_name: string } | null
    reviewed_by: string | null
    service?: { slug?: string } | null
  }

  const intake = (Array.isArray(intakeDoc.intake)
    ? intakeDoc.intake[0]
    : intakeDoc.intake) as IntakeJoin | null

  const patientRaw = intake?.patient
  const patientData = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw

  let doctorName = "InstantMed Doctor"
  if (intake?.reviewed_by) {
    const { data: doctor } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", intake.reviewed_by)
      .maybeSingle()
    if (doctor?.full_name) {
      doctorName = formatDoctorName(doctor.full_name, null)
    }
  }

  const certType = intake?.service?.slug?.includes("carer")
    ? "carer"
    : intake?.service?.slug?.includes("uni")
      ? "study"
      : "work"

  return {
    valid: true,
    certificate: {
      certificateNumber: intakeDoc.certificate_number,
      type: formatCertificateType(certType),
      issueDate: intakeDoc.created_at?.split("T")[0],
      patientName: maskPatientName(patientData?.full_name || "Patient"),
      issuingDoctor: doctorName,
      issuingClinic: "InstantMed",
    },
  }
}
