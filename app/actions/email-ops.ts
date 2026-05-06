"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { OpsTestEmail, opsTestEmailSubject } from "@/lib/email/components/templates"
import { sendEmail } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import type { ActionResult } from "@/types/shared"

const log = createLogger("email-ops-actions")

interface OpsTestEmailActionData {
  eventId: string
  sentAt: string
  outboxId?: string
  messageId?: string
}

function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "unknown"
}

export async function sendOpsTestEmailAction(): Promise<ActionResult<OpsTestEmailActionData>> {
  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(
    `admin:${authResult.profile.id}:ops-test-email`,
    "admin",
  )
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many requests. Please wait and try again." }
  }

  const recipient = authResult.profile.email?.trim()
  const eventId = randomUUID()
  const issuedAt = new Date().toISOString()

  if (!recipient) {
    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "ops_test_email",
        status: "blocked",
        event_id: eventId,
        error_code: "admin_email_missing",
      },
    })

    return {
      success: false,
      error: "Your admin profile does not have an email address to send the test to.",
      data: { eventId, sentAt: issuedAt },
    }
  }

  try {
    const result = await sendEmail({
      to: recipient,
      toName: authResult.profile.full_name || "Admin",
      subject: opsTestEmailSubject,
      template: OpsTestEmail({ eventId, issuedAt }),
      emailType: "ops_test",
      metadata: {
        action_type: "ops_test_email",
        event_id: eventId,
        issued_at: issuedAt,
      },
      tags: [
        { name: "type", value: "ops_test" },
        { name: "source", value: "admin_ops" },
      ],
    })

    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "ops_test_email",
        status: result.success ? "sent" : "failed",
        event_id: eventId,
        outbox_id: result.outboxId,
        provider_message_id: result.messageId,
        recipient_domain: getEmailDomain(recipient),
        error_code: result.success ? undefined : "ops_test_email_failed",
      },
    })

    revalidatePath("/admin/ops")
    revalidatePath("/admin/emails/hub")

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Email test failed. Check Resend and the email outbox.",
        data: { eventId, sentAt: issuedAt, outboxId: result.outboxId, messageId: result.messageId },
      }
    }

    return {
      success: true,
      data: {
        eventId,
        sentAt: issuedAt,
        outboxId: result.outboxId,
        messageId: result.messageId,
      },
    }
  } catch (error) {
    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "ops_test_email",
        status: "failed",
        event_id: eventId,
        error_type: error instanceof Error ? error.name : "UnknownError",
        error_code: "ops_test_email_exception",
      },
    })

    log.error("Ops test email failed", {
      adminId: authResult.profile.id,
      eventId,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      error: "Email test failed. Check Resend, warmup limits, and the email outbox.",
      data: { eventId, sentAt: issuedAt },
    }
  }
}
