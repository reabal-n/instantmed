"use server"

import { z } from "zod"
import { sanitizeEmail } from "@/lib/security/sanitize"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logger } from "@/lib/observability/logger"
import { sendEmail } from "@/lib/email/send-email"
import { ExitIntentReminderEmail, exitIntentReminderSubject } from "@/components/email/templates/exit-intent-reminder"
import { PRICING } from "@/lib/constants"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const schema = z.object({
  email: z.string().transform(sanitizeEmail).pipe(z.string().email()),
  service: z.enum(["medical-certificate", "prescription", "consult"]).default("medical-certificate"),
})

const SERVICE_LABELS: Record<string, string> = {
  "medical-certificate": "Medical Certificate",
  prescription: "Repeat Prescription",
  consult: "GP Consult",
}

const SERVICE_PRICES: Record<string, number> = {
  "medical-certificate": PRICING.MED_CERT,
  prescription: PRICING.REPEAT_SCRIPT,
  consult: PRICING.CONSULT,
}

interface CaptureResult {
  success: boolean
  error?: string
}

/**
 * Capture exit-intent email and send a reminder.
 * Public action — no auth required. Rate-limited by email.
 */
export async function captureExitIntentEmail(formData: {
  email: string
  service?: string
}): Promise<CaptureResult> {
  try {
    const parsed = schema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: "Invalid email address" }
    }

    const { email, service } = parsed.data

    // Rate limit by email address
    const rateResult = await checkServerActionRateLimit(`exit_intent:${email}`)
    if (!rateResult.success) {
      // Still return success to the user — don't reveal rate limiting
      return { success: true }
    }

    const label = SERVICE_LABELS[service] || "Medical Certificate"
    const price = `$${(SERVICE_PRICES[service] || PRICING.MED_CERT).toFixed(2)}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
    const ctaUrl = `${appUrl}/request?service=${service === "medical-certificate" ? "med-cert" : service}`

    await sendEmail({
      to: email,
      subject: exitIntentReminderSubject(label),
      template: ExitIntentReminderEmail({ service: label, price, ctaUrl, appUrl }),
      emailType: "exit_intent_reminder",
      tags: [
        { name: "category", value: "exit_intent_reminder" },
        { name: "service", value: service },
      ],
    })

    // Record capture in DB for nurture sequence (emails 2 & 3 sent by cron)
    // ON CONFLICT: if same email+service already active, just update reminder_1 timestamp
    try {
      const supabase = createServiceRoleClient()
      await supabase.rpc("upsert_exit_intent_capture", {
        p_email: email,
        p_service: service,
      })
    } catch {
      // Non-blocking — email 1 already sent, nurture is best-effort
      logger.warn("Failed to record exit intent capture", { service })
    }

    logger.info("Exit intent email captured", { email: email.split("@")[0] + "@***", service })

    return { success: true }
  } catch (error) {
    logger.error("Failed to capture exit intent email", { error })
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
