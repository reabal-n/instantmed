/**
 * Secure Certificate Download API
 * 
 * Generates short-lived signed URLs for certificate downloads.
 * Requires authentication and verifies ownership.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"
import { getCurrentProfile } from "@/lib/data/profiles"
import {
  getCertificateById,
  getSecureDownloadUrl,
  logCertificateEvent,
} from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("certificate-download-api")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: certificateId } = await params

    // 1. Authenticate user
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // 2. Get current profile
    const profile = await getCurrentProfile()
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 401 }
      )
    }

    // 3. Get certificate
    const certificate = await getCertificateById(certificateId)
    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      )
    }

    // 4. Verify ownership or issuing doctor/admin access
    const isOwner = certificate.patient_id === profile.id
    const isIssuingDoctor = profile.role === "doctor" && certificate.doctor_id === profile.id
    const isAdmin = profile.role === "admin"

    if (!isOwner && !isIssuingDoctor && !isAdmin) {
      log.warn("Unauthorized download attempt", {
        certificateId,
        requesterId: profile.id,
        ownerId: certificate.patient_id,
      })
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // 5. Check certificate status
    if (certificate.status !== "valid") {
      return NextResponse.json(
        { error: `Certificate is ${certificate.status}` },
        { status: 410 } // Gone
      )
    }

    // 6. Generate signed URL (5 minute expiry)
    const result = await getSecureDownloadUrl(certificateId, certificate.patient_id)

    if (!result.success || !result.url) {
      log.error("Failed to generate download URL", {
        certificateId,
        error: result.error,
      })
      return NextResponse.json(
        { error: "Failed to generate download link" },
        { status: 500 }
      )
    }

    // 7. Log download event
    await logCertificateEvent(
      certificateId,
      "downloaded",
      profile.id,
      isOwner ? "patient" : "doctor",
      {
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      }
    )

    log.info("Certificate download URL generated", {
      certificateId,
      downloadedBy: profile.id,
      role: profile.role,
    })

    // 8. Return signed URL
    return NextResponse.json({
      url: result.url,
      expiresIn: 300, // 5 minutes
      certificateNumber: certificate.certificate_number,
      filename: `Medical_Certificate_${certificate.certificate_number}.pdf`,
    })
  } catch (error) {
    log.error("Certificate download error", {}, error instanceof Error ? error : undefined)
    Sentry.captureException(error, {
      tags: { route: "certificate-download" },
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
