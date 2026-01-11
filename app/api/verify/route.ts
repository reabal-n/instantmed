import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { applyRateLimit } from "@/lib/rate-limit/redis"

export async function GET(request: Request) {
  // Apply rate limiting to prevent abuse
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json(
      { valid: false, error: "Verification code is required" },
      { status: 400 }
    )
  }

  // Validate code format (IM-XXXXXXXX or MC-XXXXXXXX)
  const codePattern = /^(IM|MC)-[A-Z0-9]{6,12}$/
  if (!codePattern.test(code)) {
    return NextResponse.json(
      { valid: false, error: "Invalid verification code format" },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceRoleClient()

    // First check med_cert_certificates table (newer certificates)
    const { data: certificate, error: certError } = await supabase
      .from("med_cert_certificates")
      .select(`
        id,
        certificate_number,
        certificate_type,
        pdf_url,
        created_at,
        patient_name,
        doctor_name,
        date_from,
        date_to
      `)
      .eq("certificate_number", code)
      .maybeSingle()

    if (!certError && certificate) {
      // Calculate expiry (certificates valid for dates specified or 1 year from issue)
      const expiresAt = certificate.date_to 
        ? new Date(certificate.date_to).toISOString()
        : new Date(new Date(certificate.created_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

      // Update verified count (fire and forget - no await needed)
      void supabase
        .from("med_cert_certificates")
        .update({ verified_count: (certificate as { verified_count?: number }).verified_count || 0 + 1 })
        .eq("id", certificate.id)

      return NextResponse.json({
        valid: true,
        document: {
          type: "med_cert",
          subtype: certificate.certificate_type || "work",
          issued_at: certificate.created_at,
          expires_at: expiresAt,
          patient_name: maskName(certificate.patient_name),
          doctor_name: certificate.doctor_name || "InstantMed Doctor",
          certificate_id: certificate.certificate_number,
        },
      })
    }

    // Check document_verifications table (older documents)
    const { data: verification, error: verifyError } = await supabase
      .from("document_verifications")
      .select(`
        id,
        verification_code,
        document_type,
        issued_at,
        expires_at,
        is_valid,
        verified_count,
        document_id
      `)
      .eq("verification_code", code)
      .maybeSingle()

    if (verifyError || !verification) {
      // Also check documents table directly
      const { data: document, error: docError } = await supabase
        .from("documents")
        .select(`
          id,
          verification_code,
          type,
          subtype,
          created_at,
          request_id
        `)
        .eq("verification_code", code)
        .maybeSingle()

      if (docError || !document) {
        return NextResponse.json({
          valid: false,
          error: "No document found with this verification code",
        })
      }

      // Get patient and doctor info from the intake
      const { data: intake } = await supabase
        .from("intakes")
        .select(`
          patient:profiles!patient_id(full_name),
          reviewed_by
        `)
        .eq("id", document.request_id)
        .maybeSingle()

      const patientRaw = intake?.patient
      const patientData = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
      
      // Get doctor name
      let doctorName = "InstantMed Doctor"
      if (intake?.reviewed_by) {
        const { data: doctor } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", intake.reviewed_by)
          .maybeSingle()
        if (doctor?.full_name) {
          doctorName = doctor.full_name
        }
      }

      return NextResponse.json({
        valid: true,
        document: {
          type: document.type,
          subtype: document.subtype || "work",
          issued_at: document.created_at,
          expires_at: new Date(new Date(document.created_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          patient_name: maskName(patientData?.full_name || "Patient"),
          doctor_name: doctorName,
          certificate_id: document.verification_code || document.id.slice(0, 8).toUpperCase(),
        },
      })
    }

    // Check if verification is still valid
    if (!verification.is_valid) {
      return NextResponse.json({
        valid: false,
        error: "This document verification has been revoked",
      })
    }

    // Check expiry
    if (verification.expires_at && new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "This document verification has expired",
      })
    }

    // Increment verified count
    await supabase
      .from("document_verifications")
      .update({ verified_count: (verification.verified_count || 0) + 1 })
      .eq("id", verification.id)

    // Get document details if we have document_id
    let patientName = "Patient"
    let doctorName = "InstantMed Doctor"

    if (verification.document_id) {
      const { data: document } = await supabase
        .from("documents")
        .select("request_id")
        .eq("id", verification.document_id)
        .maybeSingle()

      if (document?.request_id) {
        const { data: intake } = await supabase
          .from("intakes")
          .select(`
            patient:profiles!patient_id(full_name),
            reviewed_by
          `)
          .eq("id", document.request_id)
          .maybeSingle()

        const patientRaw2 = intake?.patient
        const patientData2 = Array.isArray(patientRaw2) ? patientRaw2[0] : patientRaw2
        if (patientData2?.full_name) {
          patientName = patientData2.full_name
        }

        if (intake?.reviewed_by) {
          const { data: doctor } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", intake.reviewed_by)
            .maybeSingle()
          if (doctor?.full_name) {
            doctorName = doctor.full_name
          }
        }
      }
    }

    return NextResponse.json({
      valid: true,
      document: {
        type: verification.document_type || "med_cert",
        subtype: "work",
        issued_at: verification.issued_at,
        expires_at: verification.expires_at,
        patient_name: maskName(patientName),
        doctor_name: doctorName,
        certificate_id: verification.verification_code,
      },
    })
  } catch {
    return NextResponse.json(
      { valid: false, error: "Verification service temporarily unavailable" },
      { status: 500 }
    )
  }
}

/**
 * Mask patient name for privacy (show first name + last initial)
 */
function maskName(fullName: string): string {
  if (!fullName) return "Patient"
  
  const parts = fullName.trim().split(" ")
  if (parts.length === 1) {
    return parts[0]
  }
  
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1][0]
  
  return `${firstName} ${lastInitial}.`
}
