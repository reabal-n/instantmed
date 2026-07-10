import { NextRequest, NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { getCertificateForIntake, logCertificateEvent } from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("certificate-download")

/**
 * Stream a patient's certificate PDF through the server.
 * Validates ownership before fetching. Never exposes signed URLs to the client.
 * Rate limited: 30 downloads/hour per user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: certificateId } = await params

    // Resolve the patient through the shared profile guard. This also denies
    // retained closed-account tombstones from stale sessions.
    const authResult = await getApiAuth()
    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { profile } = authResult
    const supabase = createServiceRoleClient()

    // Rate limit: 30 downloads/hour per user - reuses "upload" bucket (same 30/hr limit,
    // no dedicated "download" bucket defined in rateLimitConfigs)
    const rateLimitResponse = await applyRateLimit(request, "upload", profile.id)
    if (rateLimitResponse) return rateLimitResponse

    // Get certificate with ownership check
    const { data: certificate, error } = await supabase
      .from("issued_certificates")
      .select("id, storage_path, patient_name, certificate_type, status, intake_id")
      .eq("id", certificateId)
      .eq("patient_id", profile.id)
      .eq("status", "valid")
      .single()

    if (error || !certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
    }

    if (!certificate.storage_path) {
      return NextResponse.json({ error: "Certificate file not available" }, { status: 404 })
    }

    // An explicit certificate id is not enough: if legacy data contains two
    // valid rows, only the newest valid certificate for the intake may leave
    // the system.
    const currentCertificate = await getCertificateForIntake(certificate.intake_id)
    if (!currentCertificate || currentCertificate.id !== certificate.id) {
      return NextResponse.json(
        { error: "Certificate is no longer current" },
        { status: 410 },
      )
    }

    // Generate short-lived signed URL (5 min) - used server-side only, never exposed to client
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(certificate.storage_path, 300)

    if (urlError || !signedUrlData?.signedUrl) {
      log.error("Failed to generate signed URL", {
        certificateId,
        storagePath: certificate.storage_path,
        error: urlError?.message,
      })
      return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 })
    }

    // Stream PDF through the server - signed URL never leaves the backend
    const pdfResponse = await fetch(signedUrlData.signedUrl)
    if (!pdfResponse.ok) {
      log.error("Failed to fetch PDF from storage", {
        certificateId,
        status: pdfResponse.status,
        storagePath: certificate.storage_path,
      })
      return NextResponse.json({ error: "Certificate file not available" }, { status: 500 })
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Audit trail is part of the access control boundary. Do not release a
    // clinical document unless the access event was durably recorded.
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    const userAgent = request.headers.get("user-agent") ?? undefined
    const auditResult = await logCertificateEvent(
      certificate.id,
      "downloaded",
      profile.id,
      "patient",
      {
        file_size_bytes: pdfBuffer.byteLength,
        endpoint: "certificates_id_download",
      },
      ipAddress,
      userAgent,
    )

    if (!auditResult.success) {
      log.error("Certificate download audit write failed", {
        certificateId,
        patientId: profile.id,
      })
      return NextResponse.json(
        { error: "Certificate access is temporarily unavailable" },
        { status: 503, headers: { "Retry-After": "30" } },
      )
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="medical-certificate-${certificate.intake_id || certificateId}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "private, no-store, no-cache",
      },
    })
  } catch (error) {
    log.error("Certificate download error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
