import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { buildCertificateStepAnswers } from "@/components/request/steps/certificate-step"
import { certificateStepSchema } from "@/lib/request/validation"

/**
 * Certificate-step advance persistence contract.
 *
 * Real failure (30 days to 2026-07-19): 3 patients reached the pay step and were
 * rejected with BOTH "Please select duration" and "Please select start date",
 * 10 events each — they retried and could not get through.
 *
 * Cause: the step's selection→store sync effect is gated behind
 * `canSyncSelection`, which only opens once the persisted draft has hydrated
 * (deliberate — see certificate-step-hydration-contract, it stops a restored
 * 2–3 day duration being stomped back to 1). But `canContinue` is computed from
 * LOCAL state whose defaults are non-null on mount, and `certType` can arrive
 * from URL seeding without waiting for hydration. So Continue went ready before
 * the gate opened: tap it inside that window — or never open the gate at all,
 * with a corrupt or blocked draft store — and the patient advanced with
 * `duration`/`startDate` never written. Checkout re-runs `certificateStepSchema`
 * over the stored answers, so the miss only surfaced at Pay, past the point
 * where the patient could fix it.
 *
 * The fix persists the selection in the same event as advancing. These pins tie
 * what the step writes to what checkout demands, so the two cannot drift again.
 */

const source = readFileSync(
  resolve(process.cwd(), "components/request/steps/certificate-step.tsx"),
  "utf8",
)

describe("certificate step advance persistence", () => {
  it("builds every answer the checkout validator requires", () => {
    const answers = buildCertificateStepAnswers("work", 2, 0)
    expect(answers).not.toBeNull()
    expect(answers?.certType).toBe("work")
    expect(answers?.duration).toBe("2")
    expect(answers?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  // The contract that actually matters: the step's output must satisfy the
  // schema checkout runs. If someone adds a required field to one side only,
  // this fails here instead of at a patient's pay step.
  it("produces answers that satisfy certificateStepSchema", () => {
    for (const days of [1, 2, 3]) {
      for (const offset of [-1, 0, 1, 2]) {
        const answers = buildCertificateStepAnswers("work", days, offset)
        expect(answers, `days=${days} offset=${offset}`).not.toBeNull()
        const parsed = certificateStepSchema.safeParse(answers)
        expect(parsed.success, `days=${days} offset=${offset}`).toBe(true)
      }
    }
  })

  it("covers every certificate type the step offers", () => {
    for (const certType of ["work", "study", "carer"]) {
      const answers = buildCertificateStepAnswers(certType, 1, 0)
      expect(certificateStepSchema.safeParse(answers).success, certType).toBe(true)
    }
  })

  it("returns null on an incomplete selection rather than a partial write", () => {
    expect(buildCertificateStepAnswers(undefined, 1, 0)).toBeNull()
    expect(buildCertificateStepAnswers("", 1, 0)).toBeNull()
    expect(buildCertificateStepAnswers("nonsense", 1, 0)).toBeNull()
    expect(buildCertificateStepAnswers("work", null, 0)).toBeNull()
    expect(buildCertificateStepAnswers("work", 1, null)).toBeNull()
  })

  it("persists on advance so readiness cannot outrun the hydration gate", () => {
    expect(source).toContain("const advanceAnswers = buildCertificateStepAnswers(certType, selectedDays, startOffset)")
    expect(source).toContain('setAnswer("duration", advanceAnswers.duration)')
    expect(source).toContain('setAnswer("startDate", advanceAnswers.startDate)')
  })

  it("still leaves the hydration gate in place", () => {
    // The write-on-advance is a backstop, not a replacement: reopening the gate
    // on bare mount is what stomped restored durations in the first place.
    expect(source).toContain("if (!canSyncSelection) return")
  })
})
