/**
 * One-off operator recovery for checkouts our own platform stranded.
 *
 * Context: the 2026-07-14 checkout session-bind defect (fixed in debc1b0e9)
 * left paying customers with no Stripe session. Those intakes were marked
 * `checkout_failed` on 2026-07-16 — after the abandoned-checkout cron's 24h
 * `created_at` discovery window had already closed — so automated recovery
 * could never reach them.
 *
 * Dry run by default. Sending requires an explicit --send flag.
 *
 *   pnpm tsx scripts/recover-stranded-checkouts.ts <intakeId> [<intakeId> ...]
 *   pnpm tsx scripts/recover-stranded-checkouts.ts <intakeId> --send
 *
 * Every send is consent-gated, state-checked, one-shot (the shared
 * `abandoned_email_sent_at` CAS makes a duplicate impossible), and audit-logged.
 * Payment state is never mutated.
 */
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const args = process.argv.slice(2)
  const send = args.includes("--send")
  const intakeIds = args.filter((arg) => !arg.startsWith("--"))

  if (intakeIds.length === 0) {
    console.error("Usage: tsx scripts/recover-stranded-checkouts.ts <intakeId> [...] [--send]")
    process.exit(1)
  }

  // Imported after dotenv so module-level env reads see the loaded values.
  const { sendStrandedCheckoutRecoveryEmail } = await import("@/lib/email/abandoned-checkout")
  const { logAuditEvent } = await import("@/lib/security/audit-log")
  const { createServiceRoleClient } = await import("@/lib/supabase/service-role")

  const supabase = createServiceRoleClient()

  console.log(send ? "MODE: SEND (live)" : "MODE: dry run (no email will be sent)")
  console.log("")

  for (const intakeId of intakeIds) {
    const { data } = await supabase
      .from("intakes")
      .select("id, status, payment_status, category, subtype, created_at, abandoned_email_sent_at")
      .eq("id", intakeId)
      .maybeSingle()

    if (!data) {
      console.log(`${intakeId}  NOT FOUND`)
      continue
    }

    const eligible =
      ["pending_payment", "checkout_failed"].includes(data.status) &&
      ["pending", "unpaid", "failed"].includes(data.payment_status) &&
      data.abandoned_email_sent_at === null

    console.log(`${intakeId}`)
    console.log(`  ${data.category}/${data.subtype ?? "-"}  ${data.status}/${data.payment_status}  created ${data.created_at}`)
    console.log(`  eligible: ${eligible ? "yes" : `no (already nudged or state changed)`}`)

    if (!send) {
      console.log("  -> dry run, not sending")
      console.log("")
      continue
    }

    if (!eligible) {
      console.log("  -> skipped")
      console.log("")
      continue
    }

    const result = await sendStrandedCheckoutRecoveryEmail(intakeId)
    console.log(`  -> ${result.sent ? "SENT" : "NOT SENT"} (${result.reason})`)

    await logAuditEvent({
      action: "stranded_checkout_recovery_email",
      actorType: "admin",
      intakeId,
      metadata: { outcome: result.reason, sent: result.sent },
    })

    console.log("")
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
