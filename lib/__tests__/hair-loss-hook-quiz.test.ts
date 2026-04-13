import { describe, expect,it } from "vitest"

import {
  buildHairLossHookQuizResult,
  DURATION_BUCKETS,
  type DurationBucket,
  getHairLossHookQuizReassurance,
  HAIR_LOSS_HOOK_QUIZ_KEY,
  NORWOOD_STAGES,
  type NorwoodStage,
} from "@/lib/marketing/hair-loss-hook-quiz"

describe("NORWOOD_STAGES", () => {
  it("has exactly 7 stages numbered 1–7", () => {
    expect(NORWOOD_STAGES).toHaveLength(7)
    const numbers = NORWOOD_STAGES.map((s) => s.stage)
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it("each stage has a non-empty label", () => {
    for (const s of NORWOOD_STAGES) {
      expect(s.label).toBeTruthy()
      expect(s.label.length).toBeGreaterThan(2)
    }
  })

  it("contains no drug names", () => {
    const drugRe = /viagra|cialis|sildenafil|tadalafil|pde5|finasteride|minoxidil|propecia|rogaine/i
    for (const s of NORWOOD_STAGES) {
      expect(s.label).not.toMatch(drugRe)
      expect(s.description).not.toMatch(drugRe)
    }
  })
})

describe("DURATION_BUCKETS", () => {
  it("has exactly 4 buckets", () => {
    expect(DURATION_BUCKETS).toHaveLength(4)
  })
  it("matches the cross-phase contract ids", () => {
    const ids = DURATION_BUCKETS.map((b) => b.id)
    expect(ids).toEqual(["<6mo", "6-12mo", "1-3yr", "3yr+"])
  })
})

describe("buildHairLossHookQuizResult", () => {
  it("returns a valid result shape", () => {
    const result = buildHairLossHookQuizResult(3, "6-12mo")
    expect(result.norwood).toBe(3)
    expect(result.durationBucket).toBe("6-12mo")
    expect(result.completedAt).toBeTruthy()
  })

  it("exposes the sessionStorage key", () => {
    expect(HAIR_LOSS_HOOK_QUIZ_KEY).toBe("instantmed.hookQuiz.hair_loss.v1")
  })
})

describe("getHairLossHookQuizReassurance", () => {
  it.each([1, 2, 3, 4, 5, 6, 7] as NorwoodStage[])("returns copy for stage %i", (stage) => {
    const copy = getHairLossHookQuizReassurance(stage, "6-12mo")
    expect(copy).toBeTruthy()
    expect(copy.length).toBeGreaterThan(20)
  })

  it("never includes drug names", () => {
    const drugRe = /viagra|cialis|finasteride|minoxidil|propecia|rogaine/i
    for (const stage of [1, 2, 3, 4, 5, 6, 7] as NorwoodStage[]) {
      for (const dur of ["<6mo", "6-12mo", "1-3yr", "3yr+"] as DurationBucket[]) {
        expect(getHairLossHookQuizReassurance(stage, dur)).not.toMatch(drugRe)
      }
    }
  })
})
