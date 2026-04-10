import * as React from "react"
import * as Sentry from "@sentry/nextjs"
import { differenceInDays } from "date-fns"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendEmail } from "@/lib/email/send-email"
import {
  TreatmentFollowupEmail,
  treatmentFollowupSubject,
  type FollowupMilestone,
  type FollowupSubtype,
} from "@/components/email/templates/treatment-followup"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("treatment-followup-processor")

const MAX_REMINDERS = 3
const MIN_DAYS_BETWEEN_REMINDERS = 3

interface LogEntry {
  sentAt: Date
}

export function shouldSendReminder(input: {
  dueAt: Date
  now: Date
  completedAt: Date | null
  skipped: boolean
  logs: LogEntry[]
}): boolean {
  if (input.completedAt) return false
  if (input.skipped) return false
  if (input.now < input.dueAt) return false
  if (input.logs.length >= MAX_REMINDERS) return false

  const mostRecent = input.logs.reduce<Date | null>((acc, l) => {
    if (!acc || l.sentAt > acc) return l.sentAt
    return acc
  }, null)
  if (mostRecent && differenceInDays(input.now, mostRecent) < MIN_DAYS_BETWEEN_REMINDERS) {
    return false
  }
  return true
}

export function nextReminderNumber(logs: LogEntry[]): 1 | 2 | 3 {
  const n = logs.length + 1
  if (n > 3) return 3
  return n as 1 | 2 | 3
}

interface ProcessResult {
  processed: number
  sent: number
  skipped: number
  errors: number
}

/**
 * Runs the daily follow-up reminder sweep.
 * Safe to call from a cron route -- wraps errors per-row and logs aggregate to Sentry on failure.
 */
export async function processTreatmentFollowups(now: Date = new Date()): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, skipped: 0, errors: 0 }
  const supabase = createServiceRoleClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

  // Candidates: due, not completed, not skipped
  const { data: candidates, error: fetchErr } = await supabase
    .from("intake_followups")
    .select("id, intake_id, patient_id, subtype, milestone, due_at, completed_at, skipped")
    .is("completed_at", null)
    .eq("skipped", false)
    .lte("due_at", now.toISOString())
    .limit(500)

  if (fetchErr) {
    log.error("Failed to fetch candidates", { error: fetchErr.message })
    Sentry.captureException(fetchErr, { tags: { job: "treatment-followup" } })
    return result
  }

  if (!candidates || candidates.length === 0) return result

  result.processed = candidates.length

  for (const row of candidates) {
    try {
      // Fetch prior logs
      const { data: logs } = await supabase
        .from("followup_email_log")
        .select("sent_at")
        .eq("followup_id", row.id)
        .order("sent_at", { ascending: false })

      const logEntries: LogEntry[] = (logs ?? []).map((l) => ({ sentAt: new Date(l.sent_at) }))

      if (
        !shouldSendReminder({
          dueAt: new Date(row.due_at),
          now,
          completedAt: row.completed_at ? new Date(row.completed_at) : null,
          skipped: row.skipped,
          logs: logEntries,
        })
      ) {
        result.skipped += 1
        continue
      }

      // Fetch patient
      const { data: patient } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", row.patient_id)
        .single()

      if (!patient?.email) {
        log.warn("Skipping — no patient email", { followupId: row.id })
        result.skipped += 1
        continue
      }

      const subtype = row.subtype as FollowupSubtype
      const milestone = row.milestone as FollowupMilestone
      const reminderNumber = nextReminderNumber(logEntries)

      const sendResult = await sendEmail({
        to: patient.email,
        toName: patient.full_name || "Patient",
        subject: treatmentFollowupSubject(subtype, milestone),
        template: React.createElement(TreatmentFollowupEmail, {
          patientName: patient.full_name || "there",
          followupId: row.id,
          subtype,
          milestone,
          appUrl,
        }),
        emailType: "treatment_followup",
        intakeId: row.intake_id,
        patientId: patient.id,
        metadata: { milestone, subtype, reminder_number: reminderNumber },
      })

      if (!sendResult?.success) {
        log.warn("Email send failed — will retry tomorrow", { followupId: row.id })
        result.errors += 1
        continue
      }

      // Log the send
      await supabase.from("followup_email_log").insert({
        followup_id: row.id,
        template: "treatment-followup",
        resend_message_id: sendResult.messageId ?? null,
        reminder_number: reminderNumber,
      })

      result.sent += 1
    } catch (err) {
      result.errors += 1
      Sentry.captureException(err, {
        tags: { job: "treatment-followup", followup_id: row.id },
      })
      log.error("Row failed", { followupId: row.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  log.info("Treatment followup sweep complete", { ...result })
  return result
}
