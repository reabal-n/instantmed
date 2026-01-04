/**
 * Patient Medical Certificate Download Endpoint
 * 
 * GET /api/patient/documents/{requestId}/download
 * 
 * Allows authenticated patients to download their approved medical certificate PDF.
 * Returns the PDF file for streaming download to the browser.
 */

import { createClient } from "@/lib/supabase/server"
import { getRequestWithDetails } from "@/lib/data/requests"
import { getApiAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * GET handler for document download
 * Validates patient auth, verifies request ownership, streams PDF from Supabase
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params

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

    // Fetch request to verify ownership and approval status
    const requestData = await getRequestWithDetails(requestId)

    if (!requestData) {
      log.warn(`[document-download] Request not found: ${requestId}`)
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Verify patient owns this request
    if (requestData.patient_id !== userId) {
      log.warn(`[document-download] User ${userId} attempted to download request owned by ${requestData.patient_id}`)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify request is approved (has generated document)
    if (requestData.status !== "approved") {
      log.warn(`[document-download] Attempted download of non-approved request ${requestId} (status: ${requestData.status})`)
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

    logger.debug(`[document-download] Fetching PDF from ${doc.pdf_url}`)

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
