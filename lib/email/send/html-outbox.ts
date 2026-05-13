import "server-only"

import { logger } from "@/lib/observability/logger"

import { sendViaResend } from "../resend"
import { createPendingOutbox, updateOutboxStatus } from "./outbox"
import type { EmailType } from "./types"

interface SendHtmlEmailWithOutboxParams {
  to: string
  subject: string
  html: string
  text?: string
  emailType: EmailType
  from?: string
  replyTo?: string
  metadata?: Record<string, unknown>
  idempotencyKey?: string
  tags?: { name: string; value: string }[]
}

export async function sendHtmlEmailWithOutbox(params: SendHtmlEmailWithOutboxParams): Promise<{
  success: boolean
  error?: string
  messageId?: string
  outboxId?: string
  skipped?: boolean
}> {
  const outboxResult = await createPendingOutbox({
    email_type: params.emailType,
    to_email: params.to,
    subject: params.subject,
    provider: "resend",
    metadata: params.metadata ?? {},
    idempotency_key: params.idempotencyKey,
  })

  if (outboxResult.duplicate) {
    logger.info("[Email] Duplicate HTML send suppressed by outbox guard", {
      emailType: params.emailType,
      outboxId: outboxResult.id,
    })
    return {
      success: true,
      outboxId: outboxResult.id ?? undefined,
      skipped: true,
    }
  }

  const result = await sendViaResend({
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    from: params.from,
    replyTo: params.replyTo,
    tags: params.tags,
  })

  if (outboxResult.id) {
    await updateOutboxStatus(outboxResult.id, result.success ? (result.skipped ? "skipped_e2e" : "sent") : "failed", {
      provider_message_id: result.id,
      error_message: result.error,
      attempts: 1,
    })
  }

  return {
    success: result.success,
    error: result.error,
    messageId: result.id,
    outboxId: outboxResult.id ?? undefined,
    skipped: result.skipped,
  }
}
