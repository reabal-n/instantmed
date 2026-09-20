"use server"

import { z } from "zod"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { formatRequestAgainDate } from "@/lib/clinical/codeine-repeat-window"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { evaluateCodeineRepeatGate } from "@/lib/stripe/checkout/codeine-repeat-gate"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Early warning for the codeine combination repeat gate.
 *
 * The checkout gate (`lib/stripe/checkout/codeine-repeat-gate.ts`) is the
 * enforcement; this only lets a signed-in patient learn at the medication
 * step, before filling three more screens, that the request cannot be paid
 * for yet. Guests have no identity here and meet the same gate at checkout.
 * Every non-answer collapses to `unknown` so the client renders nothing.
 */

const logger = createLogger("codeine-repeat-check")

const inputSchema = z.object({
  medicationName: z.string().trim().min(1).max(200),
  strength: z.string().trim().max(100).optional(),
  form: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
})

export type CodeineRepeatCheckResult =
  | { status: "unknown" }
  | { status: "clear" }
  | {
      status: "blocked"
      latestIssuedDate: string
      latestIssuedLabel: string
      daysSince: number
      requestAgainOn: string
      requestAgainLabel: string
    }

export async function checkCodeineRepeatWindowAction(input: unknown): Promise<{ success: true; data: CodeineRepeatCheckResult }> {
  return { success: true, data: await checkCodeineRepeatWindow(input) }
}

async function checkCodeineRepeatWindow(input: unknown): Promise<CodeineRepeatCheckResult> {
  try {
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) return { status: "unknown" }

    const authUser = await getAuthenticatedUserWithProfile()
    const patientId = authUser?.profile?.id
    if (!patientId || authUser.profile.role !== "patient") return { status: "unknown" }

    const rateLimit = await checkServerActionRateLimit(`codeine-check:${patientId}`, "standard")
    if (!rateLimit.success) return { status: "unknown" }

    const { medicationName, strength, form, description } = parsed.data
    const gate = await evaluateCodeineRepeatGate({
      answers: {
        medications: [{ name: medicationName, strength, form, description, pbsCode: "MANUAL" }],
      },
      patientIds: [patientId],
      supabase: createServiceRoleClient(),
    })
    if (!gate.blocked) return { status: "clear" }
    return {
      status: "blocked",
      latestIssuedDate: gate.latestIssuedDate,
      latestIssuedLabel: formatRequestAgainDate(gate.latestIssuedDate),
      daysSince: gate.daysSince,
      requestAgainOn: gate.requestAgainOn,
      requestAgainLabel: formatRequestAgainDate(gate.requestAgainOn),
    }
  } catch (error) {
    logger.warn("Codeine repeat window check failed; treating as unknown", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return { status: "unknown" }
  }
}
