import { describe, expect,it } from "vitest"

import {
  ED_HOOK_QUIZ_KEY,
  ED_HOOK_QUIZ_QUESTIONS,
  scoreEdHookQuiz,
} from "@/lib/marketing/ed-hook-quiz"

describe("ED_HOOK_QUIZ_QUESTIONS", () => {
  it("has exactly 3 questions", () => {
    expect(ED_HOOK_QUIZ_QUESTIONS).toHaveLength(3)
  })

  it("each question has exactly 5 options", () => {
    for (const q of ED_HOOK_QUIZ_QUESTIONS) {
      expect(q.options).toHaveLength(5)
    }
  })

  it("each option has a score between 1 and 5", () => {
    for (const q of ED_HOOK_QUIZ_QUESTIONS) {
      for (const opt of q.options) {
        expect(opt.score).toBeGreaterThanOrEqual(1)
        expect(opt.score).toBeLessThanOrEqual(5)
      }
    }
  })

  it("contains no drug names", () => {
    const drugRe = /viagra|cialis|sildenafil|tadalafil|pde5|finasteride|minoxidil/i
    for (const q of ED_HOOK_QUIZ_QUESTIONS) {
      expect(q.prompt).not.toMatch(drugRe)
      for (const opt of q.options) {
        expect(opt.label).not.toMatch(drugRe)
      }
    }
  })
})

describe("scoreEdHookQuiz", () => {
  it("returns 'severe' for lowest scores (3–6)", () => {
    expect(scoreEdHookQuiz([1, 1, 1]).tier).toBe("severe")
    expect(scoreEdHookQuiz([2, 2, 2]).tier).toBe("severe")
  })

  it("returns 'moderate' for mid scores (7–10)", () => {
    expect(scoreEdHookQuiz([3, 2, 2]).tier).toBe("moderate")
    expect(scoreEdHookQuiz([4, 3, 3]).tier).toBe("moderate")
  })

  it("returns 'mild' for high scores (11–15)", () => {
    expect(scoreEdHookQuiz([4, 4, 3]).tier).toBe("mild")
    expect(scoreEdHookQuiz([5, 5, 5]).tier).toBe("mild")
  })

  it("exposes the sessionStorage key constant", () => {
    expect(ED_HOOK_QUIZ_KEY).toBe("instantmed.hookQuiz.ed.v1")
  })
})
