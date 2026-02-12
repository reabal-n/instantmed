"use server"

import { requireRole } from "@/lib/auth"
import {
  logClinicianViewedIntakeAnswers,
  logClinicianViewedMedicalHistory,
  logClinicianViewedSafetyFlags,
  logClinicianViewedAISummary,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { headers } from "next/headers"

/**
 * Clinician Audit Actions
 * 
 * Server actions to log clinician view events for medicolegal compliance.
 * Per MEDICOLEGAL_AUDIT_REPORT AI-3, RK-3: Track what the clinician reviewed.
 */

async function _getRequestMetadata() {
  const headersList = await headers()
  return {
    ipAddress: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || undefined,
    userAgent: headersList.get("user-agent") || undefined,
  }
}

function getRequestType(serviceType?: string): RequestType {
  if (serviceType === "med_certs") return "med_cert"
  if (serviceType === "repeat_rx" || serviceType === "common_scripts") return "repeat_rx"
  return "intake"
}

export async function logViewedIntakeAnswersAction(
  intakeId: string,
  serviceType?: string,
  viewDurationMs?: number
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireRole(["doctor", "admin"])
    if (!profile) return { success: false }

    await logClinicianViewedIntakeAnswers(
      intakeId,
      getRequestType(serviceType),
      profile.id,
      viewDurationMs
    )

    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function logViewedMedicalHistoryAction(
  intakeId: string,
  serviceType?: string
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireRole(["doctor", "admin"])
    if (!profile) return { success: false }

    await logClinicianViewedMedicalHistory(
      intakeId,
      getRequestType(serviceType),
      profile.id
    )

    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function logViewedSafetyFlagsAction(
  intakeId: string,
  serviceType?: string
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireRole(["doctor", "admin"])
    if (!profile) return { success: false }

    await logClinicianViewedSafetyFlags(
      intakeId,
      getRequestType(serviceType),
      profile.id
    )

    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function logViewedAISummaryAction(
  intakeId: string,
  serviceType?: string
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireRole(["doctor", "admin"])
    if (!profile) return { success: false }

    await logClinicianViewedAISummary(
      intakeId,
      getRequestType(serviceType),
      profile.id
    )

    return { success: true }
  } catch {
    return { success: false }
  }
}
