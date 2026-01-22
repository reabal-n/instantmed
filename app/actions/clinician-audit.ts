"use server"

import { requireAuth } from "@/lib/auth"
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
  requestId: string,
  serviceType?: string,
  viewDurationMs?: number
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) return { success: false }

    await logClinicianViewedIntakeAnswers(
      requestId,
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
  requestId: string,
  serviceType?: string
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) return { success: false }

    await logClinicianViewedMedicalHistory(
      requestId,
      getRequestType(serviceType),
      profile.id
    )

    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function logViewedSafetyFlagsAction(
  requestId: string,
  serviceType?: string
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) return { success: false }

    await logClinicianViewedSafetyFlags(
      requestId,
      getRequestType(serviceType),
      profile.id
    )

    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function logViewedAISummaryAction(
  requestId: string,
  serviceType?: string
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) return { success: false }

    await logClinicianViewedAISummary(
      requestId,
      getRequestType(serviceType),
      profile.id
    )

    return { success: true }
  } catch {
    return { success: false }
  }
}
