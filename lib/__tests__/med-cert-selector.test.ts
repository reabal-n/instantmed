import { describe, expect,it } from "vitest"

import {
  CERT_CATEGORIES,
  CERT_TYPE_POSTHOG_EVENT,
  CERT_TYPE_POSTHOG_PROPERTY,
  type CertCategory,
  isValidCertCategory,
  VALID_CERT_CATEGORIES,
} from "@/lib/marketing/med-cert-selector"

describe("CERT_CATEGORIES", () => {
  it("has exactly 3 categories", () => {
    expect(CERT_CATEGORIES).toHaveLength(3)
  })

  it("category IDs match the valid set", () => {
    const ids = CERT_CATEGORIES.map((c) => c.id)
    expect(ids).toEqual(["work", "study", "carer"])
  })

  it("each category has a non-empty label", () => {
    for (const cat of CERT_CATEGORIES) {
      expect(cat.label).toBeTruthy()
      expect(cat.label.length).toBeGreaterThan(0)
    }
  })

  it("each category has a non-empty description", () => {
    for (const cat of CERT_CATEGORIES) {
      expect(cat.description).toBeTruthy()
      expect(cat.description.length).toBeGreaterThan(10)
    }
  })

  it("each category has at least 3 reasons", () => {
    for (const cat of CERT_CATEGORIES) {
      expect(cat.reasons.length).toBeGreaterThanOrEqual(3)
      for (const reason of cat.reasons) {
        expect(reason).toBeTruthy()
      }
    }
  })

  it("work category includes common sick-day reasons", () => {
    const work = CERT_CATEGORIES.find((c) => c.id === "work")!
    expect(work.reasons).toContain("Cold & flu")
    expect(work.reasons).toContain("Mental health")
  })

  it("study category includes exam-related reasons", () => {
    const study = CERT_CATEGORIES.find((c) => c.id === "study")!
    expect(study.reasons).toContain("Exam deferral")
    expect(study.reasons).toContain("Special consideration")
  })

  it("carer category includes dependent-care reasons", () => {
    const carer = CERT_CATEGORIES.find((c) => c.id === "carer")!
    expect(carer.reasons).toContain("Sick child")
    expect(carer.reasons).toContain("Dependent care")
  })
})

describe("VALID_CERT_CATEGORIES", () => {
  it("matches CERT_CATEGORIES IDs exactly", () => {
    const ids = CERT_CATEGORIES.map((c) => c.id)
    expect([...VALID_CERT_CATEGORIES]).toEqual(ids)
  })
})

describe("PostHog event contract", () => {
  it("event name is certificate_type_selected", () => {
    expect(CERT_TYPE_POSTHOG_EVENT).toBe("certificate_type_selected")
  })

  it("property key is category", () => {
    expect(CERT_TYPE_POSTHOG_PROPERTY).toBe("category")
  })
})

describe("isValidCertCategory", () => {
  it.each(["work", "study", "carer"])("returns true for '%s'", (val) => {
    expect(isValidCertCategory(val)).toBe(true)
  })

  it.each(["", "invalid", "Work", "WORK", "sick", "leave", "123"])(
    "returns false for '%s'",
    (val) => {
      expect(isValidCertCategory(val)).toBe(false)
    },
  )

  it("narrows the type to CertCategory", () => {
    const input = "work"
    if (isValidCertCategory(input)) {
      // TypeScript should narrow `input` to CertCategory here
      const _category: CertCategory = input
      expect(_category).toBe("work")
    }
  })
})
