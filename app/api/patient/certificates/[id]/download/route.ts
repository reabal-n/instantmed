import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { logCertificateEvent } from "@/lib/data/issued-certificates"

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

    // Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get patient profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

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

    // Audit trail: log download event
    void logCertificateEvent(certificate.id, "downloaded", profile.id, "patient", {
      file_size_bytes: pdfBuffer.byteLength,
      endpoint: "certificates_id_download",
    })

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
