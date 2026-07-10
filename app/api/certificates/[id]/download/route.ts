/**
 * Secure Certificate Download API
 * 
 * Generates short-lived signed URLs for certificate downloads.
 * Requires authentication and verifies ownership.
 */

import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { hasAdminAccess, hasDoctorAccess } from "@/lib/auth/staff-capabilities"
import {
  getCertificateById,
  getCertificateForIntake,
  getSecureDownloadUrl,
  logCertificateEvent,
} from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const log = createLogger("certificate-download-api")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: certificateId } = await params

    // 1. Authenticate user
    const authResult = await getApiAuth()
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { profile } = authResult

    // Rate limit: 30 downloads/hour per user
    const rateLimitResponse = await applyRateLimit(request, "upload", profile.id)
    if (rateLimitResponse) return rateLimitResponse

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
    const isIssuingDoctor = hasDoctorAccess(profile) && certificate.doctor_id === profile.id
    const isAdmin = hasAdminAccess(profile)

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

    // A legacy data race may leave more than one row marked valid. ID-based
    // access must still resolve only the newest valid certificate for the
    // intake, matching the employer download boundary.
    const currentCertificate = await getCertificateForIntake(certificate.intake_id)
    if (!currentCertificate || currentCertificate.id !== certificate.id) {
      return NextResponse.json(
        { error: "Certificate is no longer current" },
        { status: 410 },
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

    // 7. Log download event. Do not release even a short-lived signed URL if
    // the clinical access event cannot be durably recorded.
    const auditActorRole = isOwner ? "patient" : isAdmin ? "admin" : "doctor"
    const auditResult = await logCertificateEvent(
      certificateId,
      "downloaded",
      profile.id,
      auditActorRole,
      {
        endpoint: "certificate_signed_url_download",
      },
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? request.headers.get("x-real-ip")
        ?? undefined,
      request.headers.get("user-agent") ?? undefined,
    )

    if (!auditResult.success) {
      log.error("Certificate download audit write failed", {
        certificateId,
        requesterId: profile.id,
      })
      return NextResponse.json(
        { error: "Certificate access is temporarily unavailable" },
        { status: 503, headers: { "Retry-After": "30" } },
      )
    }

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
