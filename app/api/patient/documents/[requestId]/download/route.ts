/**
 * Patient Medical Certificate Download Endpoint
 * 
 * GET /api/patient/documents/{requestId}/download
 * 
 * Allows authenticated patients to download their approved medical certificate PDF.
 * Returns the PDF file for streaming download to the browser.
 * Supports both intakes (new) and legacy requests.
 */

import { createClient } from "@/lib/supabase/server"
import { getIntakeWithDetails } from "@/lib/data/intakes"
import { getApiAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { getPostHogClient } from "@/lib/posthog-server"
const log = createLogger("route")
import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * GET handler for document download
 * Validates patient auth, verifies intake/request ownership, streams PDF from Supabase
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params // Can be intake ID or legacy request ID

    // Auth check - patients can only download their own documents
    const authResult = await getApiAuth()
    if (!authResult) {
      log.warn(`[document-download] Unauthenticated access attempt to ${requestId}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = authResult

    // Validate UUID format
    if (!requestId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      log.warn(`[document-download] Invalid request ID format: ${requestId}`)
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    log.info(`[document-download] Download request for ${requestId} by user ${userId}`)

    // Fetch intake to verify ownership and approval status
    const intakeData = await getIntakeWithDetails(requestId)

    if (!intakeData) {
      log.warn(`[document-download] Intake not found: ${requestId}`)
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Verify patient owns this intake
    if (intakeData.patient_id !== userId) {
      log.warn(`[document-download] User ${userId} attempted to download intake owned by ${intakeData.patient_id}`)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify intake is approved or completed (has generated document)
    if (!["approved", "completed"].includes(intakeData.status)) {
      log.warn(`[document-download] Attempted download of non-approved intake ${requestId} (status: ${intakeData.status})`)
      return NextResponse.json(
        { error: "Request not approved" },
        { status: 400 }
      )
    }

    // Fetch the generated document
    const supabase = await createClient()
    const { data: doc, error: docError } = await supabase
      .from("generated_documents")
      .select("id, pdf_url, type")
      .eq("request_id", requestId)
      .eq("type", "med_cert")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (docError || !doc?.pdf_url) {
      log.error(`[document-download] Document not found for ${requestId}`, { error: docError })
      return NextResponse.json(
        { error: "Document not available" },
        { status: 404 }
      )
    }

    log.debug(`[document-download] Fetching PDF from ${doc.pdf_url}`)

    // Stream the PDF from Supabase Storage
    const pdfResponse = await fetch(doc.pdf_url)

    if (!pdfResponse.ok) {
      log.error(`[document-download] Failed to fetch PDF from storage`, {
        status: pdfResponse.status,
        url: doc.pdf_url,
      })
      return NextResponse.json(
        { error: "Failed to retrieve document" },
        { status: 500 }
      )
    }

    // Get the PDF buffer
    const pdfBuffer = await pdfResponse.arrayBuffer()

    log.info(`[document-download] Successfully downloaded ${requestId} (${pdfBuffer.byteLength} bytes)`)

    // Track document download in PostHog
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: userId,
        event: 'document_downloaded',
        properties: {
          intake_id: requestId,
          document_type: 'med_cert',
          file_size_bytes: pdfBuffer.byteLength,
        },
      })
    } catch { /* non-blocking */ }

    // Return as downloadable PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="medical-certificate-${requestId}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year (immutable)
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
