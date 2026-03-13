import { NextResponse } from "next/server"
import { createLogger } from "@/lib/observability/logger"
import { verifyIntakeAction, answerCallbackQuery, editTelegramMessage, escapeMarkdown } from "@/lib/notifications/telegram"

const log = createLogger("telegram-webhook")

/**
 * Telegram Bot Webhook — handles inline button callbacks.
 * Only processes "approve" actions for med cert intakes.
 *
 * Security: each approve button has an HMAC signature derived from the bot token.
 * Only our server can generate valid signatures.
 */
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Telegram sends callback_query when an inline button is pressed
  const callbackQuery = body.callback_query as {
    id: string
    data: string
    message: { chat: { id: number }; message_id: number; text?: string }
    from: { id: number; username?: string }
  } | undefined

  if (!callbackQuery?.data) {
    return NextResponse.json({ ok: true })
  }

  // Verify the callback is from the authorized chat
  const authorizedChatId = process.env.TELEGRAM_CHAT_ID
  if (authorizedChatId && String(callbackQuery.message.chat.id) !== authorizedChatId) {
    log.warn("Telegram callback from unauthorized chat", { chatId: callbackQuery.message.chat.id })
    await answerCallbackQuery(callbackQuery.id, "Unauthorized")
    return NextResponse.json({ ok: true })
  }

  // Parse callback data: "approve:{intakeId}:{signature}"
  const parts = callbackQuery.data.split(":")
  if (parts.length !== 3 || parts[0] !== "approve") {
    await answerCallbackQuery(callbackQuery.id, "Unknown action")
    return NextResponse.json({ ok: true })
  }

  const [, intakeId, signature] = parts

  // Verify HMAC signature
  if (!verifyIntakeAction(intakeId, "approve", signature)) {
    log.warn("Invalid Telegram approval signature", { intakeId })
    await answerCallbackQuery(callbackQuery.id, "Invalid signature — please use the dashboard")
    return NextResponse.json({ ok: true })
  }

  // Approve the med cert
  try {
    await answerCallbackQuery(callbackQuery.id, "Approving...")

    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    // Verify intake is a med cert and is in a reviewable state
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, status, category, patient_id, service:services!service_id(type)")
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      log.error("Intake not found for Telegram approval", { intakeId })
      await editTelegramMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        "❌ *Approval failed*\n\nIntake not found\\.",
      )
      return NextResponse.json({ ok: true })
    }

    const serviceType = Array.isArray(intake.service) ? intake.service[0]?.type : (intake.service as { type?: string })?.type
    if (serviceType !== "med_certs") {
      await editTelegramMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        "⚠️ *Not a med cert*\n\nTelegram approval is only for medical certificates\\. Please review on the dashboard\\.",
      )
      return NextResponse.json({ ok: true })
    }

    if (!["paid", "in_review"].includes(intake.status)) {
      const refId = intakeId.slice(0, 8).toUpperCase()
      await editTelegramMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        `⚠️ *Already processed*\n\nRef: \`${refId}\` is no longer pending\\.`,
      )
      return NextResponse.json({ ok: true })
    }

    // Get doctor profile (first doctor/admin in the system)
    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("id, full_name, provider_number, ahpra_number")
      .in("role", ["doctor", "admin"])
      .not("provider_number", "is", null)
      .limit(1)
      .single()

    if (!doctorProfile) {
      await editTelegramMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        "❌ *Approval failed*\n\nNo doctor identity configured\\. Set up your certificate identity first\\.",
      )
      return NextResponse.json({ ok: true })
    }

    // Build review data and approve
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })

    // Fetch intake answers for cert details
    const { data: answersRow } = await supabase
      .from("intake_answers")
      .select("answers")
      .eq("intake_id", intakeId)
      .maybeSingle()

    const answers = (answersRow?.answers || {}) as Record<string, unknown>
    const startDate = (answers.start_date as string) || today
    const duration = parseInt(String(answers.duration || answers.number_of_days || "1"), 10)
    const endDate = (() => {
      const d = new Date(startDate)
      d.setDate(d.getDate() + duration - 1)
      return d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
    })()
    const medicalReason = (answers.symptoms as string) || (answers.reason as string) || (answers.medical_reason as string) || "Unwell — unfit for usual duties"

    // Temporarily set auth context for the server action
    // Since this is a webhook (no browser session), we call the underlying function directly
    const { approveMedCertDirect } = await import("@/lib/data/approve-direct")

    const result = await approveMedCertDirect({
      intakeId,
      doctorProfileId: doctorProfile.id,
      doctorName: doctorProfile.full_name,
      providerNumber: doctorProfile.provider_number!,
      consultDate: today,
      startDate,
      endDate,
      medicalReason,
    })

    if (result.success) {
      const refId = intakeId.slice(0, 8).toUpperCase()
      await editTelegramMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        `✅ *Approved*\n\nRef: \`${refId}\` — certificate sent to patient\\.`,
      )
      log.info("Med cert approved via Telegram", { intakeId, doctorId: doctorProfile.id })
    } else {
      await editTelegramMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        `❌ *Approval failed*\n\n${escapeMarkdown(result.error || "Unknown error")}`,
      )
      log.error("Telegram approval failed", { intakeId, error: result.error })
    }
  } catch (error) {
    log.error("Telegram approval error", { intakeId }, error instanceof Error ? error : new Error(String(error)))
    await editTelegramMessage(
      callbackQuery.message.chat.id,
      callbackQuery.message.message_id,
      "❌ *Approval failed*\n\nAn error occurred\\. Please approve from the dashboard\\.",
    )
  }

  return NextResponse.json({ ok: true })
}
