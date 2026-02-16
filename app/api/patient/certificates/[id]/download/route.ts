import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("certificate-download")

/**
 * Generate a signed download URL for a patient's certificate.
 * Validates ownership before generating the URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: certificateId } = await params

    // Verify authentication
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get patient profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get certificate with ownership check
    const { data: certificate, error } = await supabase
      .from("issued_certificates")
      .select("id, storage_path, patient_name, certificate_type, status")
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

    // Generate signed URL (1 hour expiry)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(certificate.storage_path, 3600)

    if (urlError || !signedUrlData?.signedUrl) {
      log.error("Failed to generate signed URL", {
        certificateId,
        storagePath: certificate.storage_path,
        error: urlError?.message,
      })
      return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 })
    }

    // Redirect to signed URL for download
    return NextResponse.redirect(signedUrlData.signedUrl)
  } catch (error) {
    log.error("Certificate download error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
