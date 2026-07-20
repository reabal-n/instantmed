import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Every path that marks a prescription script as sent must also notify the
 * patient.
 *
 * `markScriptSentAction` — the "Mark Sent Manually" fallback used when a
 * doctor prescribes outside Parchment — marked `script_sent`, completed the
 * request, and returned without sending anything. The patient had paid, the
 * medicine was ready, and the product went silent at the exact moment it
 * exists to deliver. `script_sent_at` then made them eligible for a
 * review-request email about a fulfilment they were never told about.
 *
 * The two Parchment-evidence paths always called `sendScriptSentEmailIfNeeded`,
 * which is why this stayed invisible: fulfilment notification worked for the
 * common path and silently did not for the fallback.
 */
const source = readFileSync(join(process.cwd(), "app/doctor/queue/actions.ts"), "utf8")

function extractAction(name: string): string {
  const start = source.indexOf(`export async function ${name}(`)
  expect(start, `${name} not found — was it renamed?`).toBeGreaterThan(-1)
  const next = source.indexOf("\nexport async function ", start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

const SCRIPT_SENT_ACTIONS = ["markScriptSentAction", "approvePrescribedScriptAction"]

describe("script-sent patient notification contract", () => {
  it.each(SCRIPT_SENT_ACTIONS)(
    "%s notifies the patient that their script was sent",
    (actionName) => {
      const body = extractAction(actionName)
      // Match the call, not a prose mention: a comment naming the helper must
      // never satisfy this contract.
      expect(
        body.includes("await sendScriptSentEmailIfNeeded("),
        `${actionName} marks a script sent without notifying the patient. A paid patient would never learn their medicine is ready.`,
      ).toBe(true)
    },
  )

  it("never fails the doctor's action because the notification failed", () => {
    const body = extractAction("markScriptSentAction")
    const callIndex = body.indexOf("await sendScriptSentEmailIfNeeded(")
    const surrounding = body.slice(Math.max(0, callIndex - 200), callIndex + 400)

    // The script really is sent by this point; an email failure is reportable,
    // not a reason to tell the doctor the action failed.
    expect(surrounding).toContain("try {")
    expect(surrounding).toContain("catch")
    expect(surrounding).toContain("Sentry.captureException")
  })

  it("reports the notification outcome back to the caller", () => {
    const body = extractAction("markScriptSentAction")
    expect(body).toContain("emailNotification")
    expect(body).toContain("return { success: true, emailNotification }")
  })
})
