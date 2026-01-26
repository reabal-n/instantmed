"use server"

import { requireRole } from "@/lib/auth"
import {
  getCertificateById,
  getCertificateForIntake,
  getSecureDownloadUrl,
  logCertificateEvent,
} from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("certificate-download-action")

interface DownloadResult {
  success: boolean
  url?: string
  filename?: string
  error?: string
}

/**
 * Get a secure download URL for a certificate by ID
 */
export async function getCertificateDownloadUrl(
  certificateId: string
): Promise<DownloadResult> {
  try {
    const { profile } = await requireRole(["patient"])

    const certificate = await getCertificateById(certificateId)
    if (!certificate) {
      return { success: false, error: "Certificate not found" }
    }

    // Verify ownership
    if (certificate.patient_id !== profile.id) {
      log.warn("Unauthorized download attempt", {
        certificateId,
        requesterId: profile.id,
      })
      return { success: false, error: "Unauthorized" }
    }

    // Check status
    if (certificate.status !== "valid") {
      return { success: false, error: `Certificate is ${certificate.status}` }
    }

    // Generate signed URL
    const result = await getSecureDownloadUrl(certificateId, profile.id)

    if (!result.success || !result.url) {
      return { success: false, error: result.error || "Failed to generate download link" }
    }

    // Log download
    await logCertificateEvent(certificateId, "downloaded", profile.id, "patient")

    return {
      success: true,
      url: result.url,
      filename: `Medical_Certificate_${certificate.certificate_number}.pdf`,
    }
  } catch (error) {
    log.error("Download error", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    }
  }
}

/**
 * Get a secure download URL for a certificate by intake ID
 */
export async function getCertificateDownloadUrlForIntake(
  intakeId: string
): Promise<DownloadResult> {
  try {
    const { profile } = await requireRole(["patient"])

    const certificate = await getCertificateForIntake(intakeId)
    if (!certificate) {
      return { success: false, error: "No certificate found for this request" }
    }

    // Verify ownership
    if (certificate.patient_id !== profile.id) {
      return { success: false, error: "Unauthorized" }
    }

    // Check status
    if (certificate.status !== "valid") {
      return { success: false, error: `Certificate is ${certificate.status}` }
    }

    // Generate signed URL
    const result = await getSecureDownloadUrl(certificate.id, profile.id)

    if (!result.success || !result.url) {
      return { success: false, error: result.error || "Failed to generate download link" }
    }

    // Log download
    await logCertificateEvent(certificate.id, "downloaded", profile.id, "patient")

    return {
      success: true,
      url: result.url,
      filename: `Medical_Certificate_${certificate.certificate_number}.pdf`,
    }
  } catch (error) {
    log.error("Download error", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    }
  }
}

/**
 * Get certificate info for display (without triggering download)
 */
export async function getCertificateInfo(intakeId: string): Promise<{
  success: boolean
  certificate?: {
    id: string
    certificateNumber: string
    status: string
    issueDate: string
    startDate: string
    endDate: string
  }
  error?: string
}> {
  try {
    const { profile } = await requireRole(["patient"])

    const certificate = await getCertificateForIntake(intakeId)
    if (!certificate) {
      return { success: false, error: "No certificate found" }
    }

    // Verify ownership
    if (certificate.patient_id !== profile.id) {
      return { success: false, error: "Unauthorized" }
    }

    return {
      success: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificate_number,
        status: certificate.status,
        issueDate: certificate.issue_date,
        startDate: certificate.start_date,
        endDate: certificate.end_date,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get certificate info",
    }
  }
}
