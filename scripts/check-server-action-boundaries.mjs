#!/usr/bin/env node
/** Classify the pinned Next production manifest without exposing action IDs or encryption material. */
import { readFileSync } from "node:fs"

const internalModules = new Set([
  "lib/data/email-outbox.ts", "lib/data/reconciliation.ts", "lib/data/intake-ops.ts", "lib/data/intake-events.ts",
  "lib/email/send/reconstruct.ts", "lib/email/send/outbox.ts", "lib/email/resend.ts", "lib/email/senders.ts",
  "lib/email/abandoned-checkout.ts", "lib/email/partial-intake-recovery.ts", "lib/notifications/service.ts",
  "app/actions/drafts/audit-log.ts", "app/actions/drafts/clinical-note-sync.ts",
  "app/actions/drafts/generate-clinical-note.ts", "app/actions/drafts/generate-consult.ts",
  "app/actions/drafts/generate-med-cert.ts", "app/actions/drafts/generate-repeat-rx.ts",
  "app/actions/generate-drafts.ts", "lib/data/intake-answer-hash.ts",
])
// Also reject re-exports through a different action facade.
const internalNames = new Set([
  "getEmailOutboxList", "getEmailOutboxById", "getEmailOutboxStats", "getDistinctEmailTypes",
  "getReconciliationRecords", "getDistinctCategories",
  "getStuckIntakes", "getDistinctServiceTypes",
  "logIntakeEvent", "logStatusChange", "logPaymentReceived", "logDocumentGenerated", "logEmailSent", "logEmailFailed", "logScriptSent", "logRefundProcessed", "getIntakeEvents",
  "reconstructEmailContent",
  "createPendingOutbox", "persistFrozenProviderPayload", "persistPartialRecoveryTrackingId", "claimOutboxRow", "updateOutboxStatus", "cancelSendingOutboxRow", "deferOutboxRow", "logToOutbox",
  "sendViaResend", "sendCriticalEmail",
  "sendRequestDeclinedEmail",
  "findAbandonedCheckouts", "sendAbandonedCheckoutEmail", "sendStrandedCheckoutRecoveryEmail", "findAbandonedFollowups", "sendAbandonedFollowupEmail", "processAbandonedCheckouts",
  "processPartialIntakeRecoveries",
  "createNotification", "notifyRequestStatusChange", "notifyPaymentReceived",
  "logAuditEvent",
  "syncClinicalNoteToIntake",
  "generateClinicalNoteDraft",
  "generateConsultDraft",
  "generateMedCertDraft",
  "generateRepeatRxDraft",
  "generateDraftsForIntake",
  "computeIntakeHash",
])
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value)

try {
  const args = process.argv.slice(2)
  const summary = args.includes("--summary")
  const paths = args.filter(arg => arg !== "--summary")
  if (paths.length > 1 || args.filter(arg => arg === "--summary").length > 1 || paths.some(arg => arg.startsWith("--"))) throw new Error("arguments")
  const manifest = JSON.parse(readFileSync(paths[0] ?? ".next/server/server-reference-manifest.json", "utf8"))
  const actions = []
  for (const runtime of ["node", "edge"]) {
    if (!isRecord(manifest[runtime])) throw new Error("runtime map")
    for (const entry of Object.values(manifest[runtime])) {
      if (!isRecord(entry) || typeof entry.filename !== "string" || !entry.filename ||
          typeof entry.exportedName !== "string" || !entry.exportedName || !isRecord(entry.workers) ||
          Object.keys(entry.workers).length === 0) throw new Error("classification metadata")
      const filename = entry.filename.replaceAll("\\", "/").replace(/^\.\//, "")
      const workers = [...new Set(Object.keys(entry.workers).map(worker =>
        worker.endsWith("/page") ? "page" : worker.endsWith("/route") ? "route" : "other"
      ))].sort()
      actions.push({ runtime, filename, exportedName: entry.exportedName, workers,
        internal: internalModules.has(filename) || internalNames.has(entry.exportedName) })
    }
  }
  if (actions.length === 0) throw new Error("empty action inventory")
  actions.sort((a, b) => `${a.runtime}/${a.filename}/${a.exportedName}`.localeCompare(`${b.runtime}/${b.filename}/${b.exportedName}`))
  const passed = actions.every(action => !action.internal)
  const violations = actions.filter(action => action.internal)
  const report = summary ? {
    passed,
    counts: { node: actions.filter(action => action.runtime === "node").length,
      edge: actions.filter(action => action.runtime === "edge").length, internal: violations.length },
    violations,
  } : { passed, actions }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exitCode = passed ? 0 : 1
} catch {
  // Never print raw parser errors: they can contain manifest bytes, including secrets.
  process.stderr.write("Server-action manifest is missing, invalid, or cannot be classified. Build with the pinned Next runtime and retry.\n")
  process.exitCode = 1
}
