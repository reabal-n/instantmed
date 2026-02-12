"use server"

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("patient-documents")

/**
 * GET /api/patient/documents/[intakeId]
 * Download a document that belongs to the authenticated patient
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ intakeId: string }> }
) {
  try {
    const { intakeId: documentId } = await params
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get document with ownership check through intake
    const { data: document, error: docError } = await supabase
      .from("intake_documents")
      .select(`
        id,
        filename,
        storage_path,
        mime_type,
        intake:intakes!intake_id (
          patient_id
        )
      `)
      .eq("id", documentId)
      .single()

    if (docError || !document) {
      log.warn("Document not found", { documentId, clerkUserId })
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Verify ownership
    const intake = document.intake as unknown as { patient_id: string } | null
    if (!intake || intake.patient_id !== profile.id) {
      log.warn("Unauthorized document access attempt", { 
        documentId, 
        clerkUserId, 
        patientId: profile.id 
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Download from storage using service role (bypasses RLS on storage)
    const storageClient = createServiceRoleClient()
    const { data: fileData, error: downloadError } = await storageClient.storage
      .from("documents")
      .download(document.storage_path)

    if (downloadError || !fileData) {
      log.error("Failed to download document from storage", { 
        documentId, 
        storagePath: document.storage_path 
      }, downloadError)
      return NextResponse.json({ error: "Failed to retrieve document" }, { status: 500 })
    }

    // Return the file
    const arrayBuffer = await fileData.arrayBuffer()
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": document.mime_type || "application/pdf",
        "Content-Disposition": `attachment; filename="${document.filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    log.error("Error downloading document", {}, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
