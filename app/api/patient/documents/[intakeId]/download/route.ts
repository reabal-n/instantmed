/**
 * Patient Medical Certificate Download Endpoint
 * 
 * GET /api/patient/documents/{intakeId}/download
 * 
 * Allows authenticated patients to download their approved medical certificate PDF.
 * Returns the PDF file for streaming download to the browser.
 * Supports both intakes (new) and legacy requests.
 */

import { getPostHogClient } from "@/lib/analytics/posthog-server"
import { getApiAuth } from "@/lib/auth/helpers"
import { getIntakeWithDetails } from "@/lib/data/intakes"
import { getCertificateForIntake, logCertificateEvent } from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
const log = createLogger("route")
import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * GET handler for document download
 * Validates patient auth, verifies intake/request ownership, streams PDF from Supabase
 * Rate limited: 30 downloads/hour per user to prevent abuse
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ intakeId: string }> }
) {
  try {
    const { intakeId } = await params

    // Auth check - patients can only download their own documents
    const authResult = await getApiAuth()
    if (!authResult) {
      log.warn(`[document-download] Unauthenticated access attempt to ${intakeId}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { profile } = authResult

    // Rate limit: 30 downloads/hour per user
    const rateLimitResponse = await applyRateLimit(request, "upload", profile.id)
    if (rateLimitResponse) return rateLimitResponse

    // Validate UUID format
    if (!intakeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      log.warn(`[document-download] Invalid intake ID format: ${intakeId}`)
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    log.info(`[document-download] Download request for ${intakeId} by user ${profile.id}`)

    // Fetch intake to verify ownership and approval status
    const intakeData = await getIntakeWithDetails(intakeId)

    if (!intakeData) {
      log.warn(`[document-download] Intake not found: ${intakeId}`)
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Verify patient owns this intake
    if (intakeData.patient_id !== profile.id) {
      log.warn(`[document-download] User ${profile.id} attempted to download intake owned by ${intakeData.patient_id}`)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify intake is approved or completed (has generated document)
    if (!["approved", "completed"].includes(intakeData.status)) {
      log.warn(`[document-download] Attempted download of non-approved intake ${intakeId} (status: ${intakeData.status})`)
      return NextResponse.json(
        { error: "Request not approved" },
        { status: 400 }
      )
    }

    // Fetch certificate from issued_certificates (new canonical table)
    const certificate = await getCertificateForIntake(intakeId)

    if (!certificate || certificate.status !== "valid") {
      log.error(`[document-download] Certificate not found for ${intakeId}`)
      return NextResponse.json(
        { error: "Document not available" },
        { status: 404 }
      )
    }

    // Generate signed URL for the PDF
    const supabase = createServiceRoleClient()
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(certificate.storage_path, 300) // 5 minute expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      log.error(`[document-download] Failed to generate signed URL for ${intakeId}`, { error: signedUrlError })
      return NextResponse.json(
        { error: "Failed to generate download link" },
        { status: 500 }
      )
    }

    log.debug(`[document-download] Fetching PDF from storage`)

    // Stream the PDF from Supabase Storage
    const pdfResponse = await fetch(signedUrlData.signedUrl)

    if (!pdfResponse.ok) {
      log.error(`[document-download] Failed to fetch PDF from storage`, {
        status: pdfResponse.status,
        storagePath: certificate.storage_path,
      })
      return NextResponse.json(
        { error: "Failed to retrieve document" },
        { status: 500 }
      )
    }

    // Get the PDF buffer
    const pdfBuffer = await pdfResponse.arrayBuffer()

    // A clinical document must not leave the application unless its access
    // event was durably recorded. This legacy intake-keyed route stays live for
    // old bookmarks, so it must enforce the same boundary as the canonical
    // certificate-keyed patient route.
    const auditResult = await logCertificateEvent(
      certificate.id,
      "downloaded",
      profile.id,
      "patient",
      {
        file_size_bytes: pdfBuffer.byteLength,
        endpoint: "patient_documents_intake_download",
      },
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      request.headers.get("user-agent") ?? undefined,
    )

    if (!auditResult.success) {
      log.error("[document-download] Certificate download audit write failed", {
        intakeId,
        certificateId: certificate.id,
      })
      return NextResponse.json(
        { error: "Certificate access is temporarily unavailable" },
        { status: 503, headers: { "Retry-After": "30" } },
      )
    }

    // Count the download only after the durable clinical access audit accepts
    // it. This keeps analytics aligned with what the patient actually received.
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: profile.id,
        event: 'document_downloaded',
        properties: {
          intake_id: intakeId,
          document_type: 'med_cert',
          file_size_bytes: pdfBuffer.byteLength,
        },
      })
    } catch { /* non-blocking */ }

    log.info(`[document-download] Successfully released ${intakeId} (${pdfBuffer.byteLength} bytes)`)

    // Return as downloadable PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="medical-certificate-${intakeId}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "private, no-store, no-cache",
      },
    })
  } catch (error) {
    log.error(`[document-download] Unexpected error`, {
      error: error instanceof Error ? error.message : "unknown",
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
