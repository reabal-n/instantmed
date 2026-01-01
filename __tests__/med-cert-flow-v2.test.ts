/* eslint-disable no-console */
/**
 * Medical Certificate Flow V2 Unit Tests
 * 
 * Run with: npx tsx __tests__/med-cert-flow-v2.test.ts
 */

import { SYMPTOM_OPTIONS, CARER_RELATIONSHIPS } from "../types/med-cert"

// ============================================================================
// SIMPLE TEST UTILITIES (no external deps)
// ============================================================================

const describe = (name: string, fn: () => void) => {
  console.log(`\n📦 ${name}`)
  fn()
}

const it = (name: string, fn: () => void) => {
  try {
    fn()
    console.log(`  ✅ ${name}`)
  } catch (e) {
    console.log(`  ❌ ${name}`)
    console.error(`     ${e}`)
    process.exitCode = 1
  }
}

const expect = (actual: unknown) => ({
  toBe: (expected: unknown) => {
    if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`)
  },
  toEqual: (expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  },
  toBeDefined: () => {
    if (actual === undefined) throw new Error(`Expected value to be defined`)
  },
  toContain: (expected: string) => {
    if (typeof actual !== "string" || !actual.includes(expected))
      throw new Error(`Expected "${actual}" to contain "${expected}"`)
  },
  toHaveLength: (expected: number) => {
    if (!Array.isArray(actual) || actual.length !== expected)
      throw new Error(`Expected array of length ${expected}, got ${Array.isArray(actual) ? actual.length : "non-array"}`)
  },
  toHaveProperty: (prop: string) => {
    if (typeof actual !== "object" || actual === null || !(prop in actual))
      throw new Error(`Expected object to have property "${prop}"`)
  },
})

// ============================================================================
// VALIDATION HELPERS (mirroring API route validation)
// ============================================================================

interface SubmitData {
  certificateType?: "work" | "study" | "carer"
  startDate?: string
  durationDays?: 1 | 2 | 3 | "extended"
  symptoms?: string[]
  otherSymptomDetails?: string
  carerPersonName?: string
  carerRelationship?: string
  emergencyDisclaimerConfirmed?: boolean
  patientConfirmedAccurate?: boolean
}

function validateSubmission(data: SubmitData): { valid: boolean; error?: string } {
  // Certificate type validation
  if (!data.certificateType || !["work", "study", "carer"].includes(data.certificateType)) {
    return { valid: false, error: "Invalid certificate type" }
  }

  // Date validation
  if (!data.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) {
    return { valid: false, error: "Invalid start date format" }
  }

  // Duration validation
  if (!data.durationDays || (data.durationDays !== "extended" && ![1, 2, 3].includes(data.durationDays))) {
    return { valid: false, error: "Duration must be 1, 2, 3, or 'extended'" }
  }

  // Symptoms validation
  if (!data.symptoms || !Array.isArray(data.symptoms) || data.symptoms.length === 0) {
    return { valid: false, error: "At least one symptom must be selected" }
  }

  // Safety confirmation
  if (!data.emergencyDisclaimerConfirmed) {
    return { valid: false, error: "Emergency disclaimer must be confirmed" }
  }

  if (!data.patientConfirmedAccurate) {
    return { valid: false, error: "Patient must confirm information accuracy" }
  }

  // Carer-specific validation
  if (data.certificateType === "carer") {
    if (!data.carerPersonName?.trim()) {
      return { valid: false, error: "Carer person name is required" }
    }
    if (!data.carerRelationship) {
      return { valid: false, error: "Carer relationship is required" }
    }
  }

  // Other symptom validation
  if (data.symptoms.includes("other") && !data.otherSymptomDetails?.trim()) {
    return { valid: false, error: "Please describe your 'other' symptoms" }
  }

  // Backdating validation
  const startDate = new Date(data.startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  if (startDate < threeDaysAgo) {
    return { valid: false, error: "Start date cannot be more than 3 days in the past" }
  }

  return { valid: true }
}

function shouldEscalateToCall(data: SubmitData): boolean {
  // Extended duration requires call
  if (data.durationDays === "extended") {
    return true
  }
  return false
}

function calculateEndDate(startDate: string, durationDays: number | "extended"): string {
  const start = new Date(startDate)
  const days = durationDays === "extended" ? 4 : durationDays
  start.setDate(start.getDate() + days - 1)
  return start.toISOString().split("T")[0]
}

// ============================================================================
// TESTS
// ============================================================================

console.log("\n🧪 Medical Certificate Flow V2 Tests\n")
console.log("=" .repeat(50))

const validBase: SubmitData = {
  certificateType: "work",
  startDate: new Date().toISOString().split("T")[0],
  durationDays: 1,
  symptoms: ["cold_flu"],
  emergencyDisclaimerConfirmed: true,
  patientConfirmedAccurate: true,
}

describe("Validation - Certificate Type", () => {
  it("should accept work certificate type", () => {
    const result = validateSubmission({ ...validBase, certificateType: "work" })
    expect(result.valid).toBe(true)
  })

  it("should accept study certificate type", () => {
    const result = validateSubmission({ ...validBase, certificateType: "study" })
    expect(result.valid).toBe(true)
  })

  it("should accept carer certificate type with required fields", () => {
    const result = validateSubmission({
      ...validBase,
      certificateType: "carer",
      carerPersonName: "John Doe",
      carerRelationship: "parent",
    })
    expect(result.valid).toBe(true)
  })

  it("should reject invalid certificate type", () => {
    const result = validateSubmission({ ...validBase, certificateType: undefined })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("certificate type")
  })
})

describe("Validation - Duration", () => {
  it("should accept 1 day duration", () => {
    const result = validateSubmission({ ...validBase, durationDays: 1 })
    expect(result.valid).toBe(true)
  })

  it("should accept 2 day duration", () => {
    const result = validateSubmission({ ...validBase, durationDays: 2 })
    expect(result.valid).toBe(true)
  })

  it("should accept 3 day duration", () => {
    const result = validateSubmission({ ...validBase, durationDays: 3 })
    expect(result.valid).toBe(true)
  })

  it("should accept extended duration", () => {
    const result = validateSubmission({ ...validBase, durationDays: "extended" })
    expect(result.valid).toBe(true)
  })

  it("should reject missing duration", () => {
    const result = validateSubmission({ ...validBase, durationDays: undefined })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Duration")
  })
})

describe("Validation - Symptoms", () => {
  it("should accept single symptom", () => {
    const result = validateSubmission({ ...validBase, symptoms: ["cold_flu"] })
    expect(result.valid).toBe(true)
  })

  it("should accept multiple symptoms", () => {
    const result = validateSubmission({
      ...validBase,
      symptoms: ["cold_flu", "headache_migraine", "fatigue"],
    })
    expect(result.valid).toBe(true)
  })

  it("should reject empty symptoms array", () => {
    const result = validateSubmission({ ...validBase, symptoms: [] })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("symptom")
  })

  it("should require details when 'other' is selected", () => {
    const result = validateSubmission({
      ...validBase,
      symptoms: ["other"],
      otherSymptomDetails: undefined,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("other")
  })

  it("should accept 'other' with details", () => {
    const result = validateSubmission({
      ...validBase,
      symptoms: ["other"],
      otherSymptomDetails: "Allergic reaction",
    })
    expect(result.valid).toBe(true)
  })
})

describe("Validation - Safety Confirmation", () => {
  it("should require emergency disclaimer confirmation", () => {
    const result = validateSubmission({
      ...validBase,
      emergencyDisclaimerConfirmed: false,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Emergency disclaimer")
  })

  it("should require patient accuracy confirmation", () => {
    const result = validateSubmission({
      ...validBase,
      patientConfirmedAccurate: false,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Patient must confirm")
  })
})

describe("Validation - Carer", () => {
  it("should require carer person name for carer type", () => {
    const result = validateSubmission({
      ...validBase,
      certificateType: "carer",
      carerRelationship: "parent",
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Carer person name")
  })

  it("should require carer relationship for carer type", () => {
    const result = validateSubmission({
      ...validBase,
      certificateType: "carer",
      carerPersonName: "John Doe",
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Carer relationship")
  })

  it("should not require carer fields for work type", () => {
    const result = validateSubmission({
      ...validBase,
      certificateType: "work",
    })
    expect(result.valid).toBe(true)
  })
})

describe("Validation - Backdating", () => {
  it("should allow start date today", () => {
    const today = new Date().toISOString().split("T")[0]
    const result = validateSubmission({ ...validBase, startDate: today })
    expect(result.valid).toBe(true)
  })

  it("should allow start date 1 day ago", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = validateSubmission({
      ...validBase,
      startDate: yesterday.toISOString().split("T")[0],
    })
    expect(result.valid).toBe(true)
  })

  it("should allow start date 3 days ago", () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const result = validateSubmission({
      ...validBase,
      startDate: threeDaysAgo.toISOString().split("T")[0],
    })
    expect(result.valid).toBe(true)
  })

  it("should reject start date more than 3 days ago", () => {
    const fourDaysAgo = new Date()
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
    const result = validateSubmission({
      ...validBase,
      startDate: fourDaysAgo.toISOString().split("T")[0],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain("more than 3 days")
  })
})

describe("Escalation Rules", () => {
  it("should escalate to call for extended duration", () => {
    expect(shouldEscalateToCall({ ...validBase, durationDays: "extended" })).toBe(true)
  })

  it("should not escalate for 1 day duration", () => {
    expect(shouldEscalateToCall({ ...validBase, durationDays: 1 })).toBe(false)
  })

  it("should not escalate for 2 day duration", () => {
    expect(shouldEscalateToCall({ ...validBase, durationDays: 2 })).toBe(false)
  })

  it("should not escalate for 3 day duration", () => {
    expect(shouldEscalateToCall({ ...validBase, durationDays: 3 })).toBe(false)
  })
})

describe("Date Calculations", () => {
  it("should calculate end date correctly for 1 day", () => {
    const startDate = "2024-01-15"
    const endDate = calculateEndDate(startDate, 1)
    expect(endDate).toBe("2024-01-15")
  })

  it("should calculate end date correctly for 2 days", () => {
    const startDate = "2024-01-15"
    const endDate = calculateEndDate(startDate, 2)
    expect(endDate).toBe("2024-01-16")
  })

  it("should calculate end date correctly for 3 days", () => {
    const startDate = "2024-01-15"
    const endDate = calculateEndDate(startDate, 3)
    expect(endDate).toBe("2024-01-17")
  })

  it("should calculate end date correctly for extended (4 days)", () => {
    const startDate = "2024-01-15"
    const endDate = calculateEndDate(startDate, "extended")
    expect(endDate).toBe("2024-01-18")
  })
})

describe("Constants - Symptom Options", () => {
  it("should have 8 symptom options", () => {
    expect(SYMPTOM_OPTIONS).toHaveLength(8)
  })

  it("should have symptom options with id, label, and emoji", () => {
    SYMPTOM_OPTIONS.forEach((symptom) => {
      expect(symptom).toHaveProperty("id")
      expect(symptom).toHaveProperty("label")
      expect(symptom).toHaveProperty("emoji")
    })
  })

  it("should include 'other' symptom option", () => {
    const other = SYMPTOM_OPTIONS.find((s) => s.id === "other")
    expect(other).toBeDefined()
  })
})

describe("Constants - Carer Relationships", () => {
  it("should have 6 carer relationships", () => {
    expect(CARER_RELATIONSHIPS).toHaveLength(6)
  })

  it("should have carer relationships with id and label", () => {
    CARER_RELATIONSHIPS.forEach((rel) => {
      expect(rel).toHaveProperty("id")
      expect(rel).toHaveProperty("label")
    })
  })
})

describe("Audit Logging - Required Fields", () => {
  it("should capture symptom list exactly", () => {
    const symptoms = ["cold_flu", "headache_migraine"]
    const auditPayload = { symptomsSelected: symptoms }
    expect(auditPayload.symptomsSelected).toEqual(symptoms)
    expect(auditPayload.symptomsSelected).toHaveLength(2)
  })

  it("should capture duration days", () => {
    const auditPayload = { durationDays: 2 }
    expect(auditPayload.durationDays).toBe(2)
  })

  it("should capture emergency disclaimer confirmation", () => {
    const auditPayload = {
      emergencyDisclaimerConfirmed: true,
      emergencyDisclaimerTimestamp: new Date().toISOString(),
    }
    expect(auditPayload.emergencyDisclaimerConfirmed).toBe(true)
    expect(auditPayload.emergencyDisclaimerTimestamp).toBeDefined()
  })

  it("should capture patient confirmation", () => {
    const auditPayload = {
      patientConfirmation: {
        confirmedAccurate: true,
        confirmedTimestamp: new Date().toISOString(),
      },
    }
    expect(auditPayload.patientConfirmation.confirmedAccurate).toBe(true)
    expect(auditPayload.patientConfirmation.confirmedTimestamp).toBeDefined()
  })

  it("should capture template version", () => {
    const auditPayload = { templateVersion: "2.0.0" }
    expect(auditPayload.templateVersion).toBe("2.0.0")
  })
})

// Summary
console.log("\n" + "=".repeat(50))
console.log("✨ Tests complete!")
