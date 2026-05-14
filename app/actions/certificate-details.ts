"use server"

import { requireRole } from "@/lib/auth/helpers"
import { getActiveTemplate } from "@/lib/data/certificate-templates"
import { getActiveClinicIdentity } from "@/lib/data/clinic-identity"
import { createLogger } from "@/lib/observability/logger"
import type {
  CertificateTemplate,
  ClinicIdentity,
} from "@/types/certificate-template"

const log = createLogger("certificate-details-actions")

export interface CertificateDetailsData {
  clinicIdentity: ClinicIdentity | null
  activeTemplate: CertificateTemplate | null
}

export async function loadCertificateDetailsData(): Promise<{
  success: boolean
  data?: CertificateDetailsData
  error?: string
}> {
  try {
    await requireRole(["admin"])

    const [clinicIdentity, activeTemplate] = await Promise.all([
      getActiveClinicIdentity(),
      getActiveTemplate("med_cert"),
    ])

    return {
      success: true,
      data: { clinicIdentity, activeTemplate },
    }
  } catch (error) {
    log.error(
      "Failed to load certificate details data",
      {},
      error instanceof Error ? error : undefined,
    )
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load certificate details",
    }
  }
}
