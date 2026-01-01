/* eslint-disable no-console */
/**
 * Rules Engine Unit Tests
 * 
 * Note: This project uses a custom test setup. Run with:
 * npx tsx __tests__/repeat-rx/rules-engine.test.ts
 * 
 * Or install vitest: pnpm add -D vitest
 */

// Simple test utilities (no external deps)
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
  not: {
    toBeNull: () => {
      if (actual === null) throw new Error(`Expected non-null, got null`)
    },
  },
  toBeNull: () => {
    if (actual !== null) throw new Error(`Expected null, got ${actual}`)
  },
  toBeGreaterThan: (n: number) => {
    if (typeof actual !== 'number' || actual <= n) throw new Error(`Expected > ${n}, got ${actual}`)
  },
})
import {
  checkEligibility,
  generateSuggestedDecision,
  isExcludedMedication,
} from "@/lib/repeat-rx/rules-engine"
import type { MedicationSelection, RepeatRxIntakeAnswers } from "@/types/repeat-rx"

// ============================================================================
// TEST DATA
// ============================================================================

const createMedication = (name: string, code: string = "12345"): MedicationSelection => ({
  amt_code: code,
  display: name,
  medication_name: name.split(" ")[0],
  strength: "10mg",
  form: "tablet",
})

const createAnswers = (overrides: Partial<RepeatRxIntakeAnswers> = {}): Partial<RepeatRxIntakeAnswers> => ({
  stabilityDuration: "6_months_plus",
  lastPrescribedTimeframe: "less_3_months",
  doseChangedRecently: false,
  sideEffects: "none",
  pregnantOrBreastfeeding: false,
  allergies: [],
  gpAttestationAccepted: true,
  pmhxFlags: {
    heartDisease: false,
    kidneyDisease: false,
    liverDisease: false,
    diabetes: false,
    mentalHealthCondition: false,
    otherSignificant: false,
  },
  ...overrides,
})

// ============================================================================
// EXCLUDED MEDICATION TESTS
// ============================================================================

describe("isExcludedMedication", () => {
  it("should reject S8 opioids", () => {
    const opioids = [
      "oxycodone 10mg tablet",
      "morphine sulfate 30mg",
      "fentanyl patch 25mcg",
      "tramadol 50mg capsule",
      "hydromorphone 4mg",
      "methadone 10mg",
      "buprenorphine 8mg",
    ]
    
    opioids.forEach((name) => {
      const result = isExcludedMedication(createMedication(name))
      expect(result).not.toBeNull()
      expect(result?.category).toBe("s8_opioid")
    })
  })
  
  it("should reject benzodiazepines", () => {
    const benzos = [
      "diazepam",
      "alprazolam",
      "lorazepam",
      "clonazepam",
      "oxazepam",
      "temazepam",
      "nitrazepam",
    ]
    
    benzos.forEach((name) => {
      const result = isExcludedMedication(createMedication(name))
      expect(result).not.toBeNull()
      expect(result?.category).toBe("benzodiazepine")
    })
  })
  
  it("should reject stimulants", () => {
    const stimulants = [
      "methylphenidate 10mg tablet",
      "dexamphetamine 5mg tablet",
      "lisdexamfetamine 30mg capsule",
      "vyvanse 50mg capsule",
      "ritalin 10mg tablet",
    ]
    
    stimulants.forEach((name) => {
      const result = isExcludedMedication(createMedication(name))
      expect(result).not.toBeNull()
      expect(result?.category).toBe("s8_stimulant")
    })
  })
  
  it("should reject Z-drugs", () => {
    const zDrugs = ["zolpidem", "zopiclone", "eszopiclone"]
    
    zDrugs.forEach((name) => {
      const result = isExcludedMedication(createMedication(name))
      expect(result).not.toBeNull()
      expect(result?.category).toBe("z_drug")
    })
  })
  
  it("should reject cannabis medications", () => {
    const cannabis = ["cannabidiol", "cannabis", "thc", "medicinal cannabis"]
    
    cannabis.forEach((name) => {
      const result = isExcludedMedication(createMedication(name))
      expect(result).not.toBeNull()
      expect(result?.category).toBe("cannabis")
    })
  })
  
  it("should reject testosterone/TRT", () => {
    const testosterone = ["testosterone gel 50mg", "reandron 1000mg injection", "primoteston 250mg"]
    
    testosterone.forEach((name) => {
      const result = isExcludedMedication(createMedication(name))
      expect(result).not.toBeNull()
      expect(result?.category).toBe("testosterone")
    })
  })
  
  it("should reject mental health medications", () => {
    const mentalHealth = [
      "quetiapine",
      "olanzapine",
      "risperidone",
      "aripiprazole",
      "lithium",
      "valproate",
      "clozapine",
    ]
    
    mentalHealth.forEach((name) => {
      const result = isExcludedMedication(createMedication(name))
      expect(result).not.toBeNull()
      expect(result?.category).toBe("mental_health")
    })
  })
  
  it("should allow safe medications", () => {
    const safeMeds = [
      "atorvastatin",
      "metformin",
      "amlodipine",
      "omeprazole",
      "rosuvastatin",
      "perindopril",
      "paracetamol",
    ]
    
    safeMeds.forEach((name) => {
      const result = isExcludedMedication(createMedication(name))
      expect(result).toBeNull()
    })
  })
})

// ============================================================================
// ELIGIBILITY CHECK TESTS
// ============================================================================

describe("checkEligibility", () => {
  describe("excluded medications", () => {
    it("should reject requests for opioids", () => {
      const result = checkEligibility(
        createMedication("oxycodone 10mg tablet"),
        createAnswers()
      )
      
      expect(result.passed).toBe(false)
      expect(result.canProceed).toBe(false)
      // Excluded medications return early with rejectionReason, not redFlags
      expect(result.rejectionReason).toBe("excluded_medication")
    })
    
    it("should reject requests for benzodiazepines", () => {
      const result = checkEligibility(
        createMedication("diazepam 5mg tablet"),
        createAnswers()
      )
      
      expect(result.passed).toBe(false)
      expect(result.canProceed).toBe(false)
    })
  })
  
  describe("stability duration", () => {
    it("should pass with 6+ months stability", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ stabilityDuration: "6_months_plus" })
      )
      
      expect(result.passed).toBe(true)
    })
    
    it("should fail with less than 6 months stability", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ stabilityDuration: "less_3_months" })
      )
      
      expect(result.passed).toBe(false)
      // Check that stability rule failed
      expect(result.ruleOutcomes.some(r => r.ruleId === "stability_duration" && !r.passed)).toBe(true)
    })
    
    it("should fail with 3-6 months stability", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ stabilityDuration: "3_6_months" })
      )
      
      expect(result.passed).toBe(false)
      expect(result.canProceed).toBe(true)
    })
  })
  
  describe("dose changes", () => {
    it("should flag recent dose changes", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ doseChangedRecently: true })
      )
      
      expect(result.passed).toBe(false)
      // Check that dose change rule failed (ruleId is 'dose_changed' singular)
      expect(result.ruleOutcomes.some(r => r.ruleId === "dose_changed" && !r.passed)).toBe(true)
    })
  })
  
  describe("side effects", () => {
    it("should flag significant side effects", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ sideEffects: "significant" })
      )
      
      expect(result.passed).toBe(false)
      expect(result.canProceed).toBe(true)
      expect(result.redFlags.some(f => f.code === "SIGNIFICANT_SIDE_EFFECTS")).toBe(true)
    })
    
    it("should pass with no side effects", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ sideEffects: "none" })
      )
      
      expect(result.passed).toBe(true)
    })
    
    it("should pass with mild side effects", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ sideEffects: "mild" })
      )
      
      expect(result.passed).toBe(true)
    })
  })
  
  describe("pregnancy/breastfeeding", () => {
    it("should flag pregnancy", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ pregnantOrBreastfeeding: true })
      )
      
      expect(result.passed).toBe(false)
      expect(result.canProceed).toBe(true)
      expect(result.redFlags.some(f => f.code === "PREGNANCY_BREASTFEEDING")).toBe(true)
    })
  })
  
  describe("GP attestation", () => {
    it("should fail without GP attestation", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ gpAttestationAccepted: false })
      )
      
      expect(result.passed).toBe(false)
      // Check that GP attestation rule failed
      expect(result.ruleOutcomes.some(r => r.ruleId === "gp_attestation" && !r.passed)).toBe(true)
    })
  })
  
  describe("medical history", () => {
    it("should flag heart disease for statins", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({
          pmhxFlags: {
            heartDisease: true,
            kidneyDisease: false,
            liverDisease: false,
            diabetes: false,
            mentalHealthCondition: false,
            otherSignificant: false,
          },
        })
      )
      
      // Medical history flags create warnings but don't block (ruleId is 'pmhx_flags')
      expect(result.ruleOutcomes.some(r => r.ruleId === "pmhx_flags" && !r.passed)).toBe(true)
    })
    
    it("should flag kidney disease", () => {
      const result = checkEligibility(
        createMedication("metformin 500mg tablet"),
        createAnswers({
          pmhxFlags: {
            heartDisease: false,
            kidneyDisease: true,
            liverDisease: false,
            diabetes: false,
            mentalHealthCondition: false,
            otherSignificant: false,
          },
        })
      )
      
      // Medical history flags create warnings but don't block (ruleId is 'pmhx_flags')
      expect(result.ruleOutcomes.some(r => r.ruleId === "pmhx_flags" && !r.passed)).toBe(true)
    })
  })
  
  describe("last prescribed timeframe", () => {
    it("should flag prescriptions over 12 months old", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ lastPrescribedTimeframe: "over_12_months" })
      )
      
      // Old prescriptions create warnings
      expect(result.ruleOutcomes.some(r => r.ruleId === "last_prescribed" && !r.passed)).toBe(true)
    })
    
    it("should pass with recent prescription", () => {
      const result = checkEligibility(
        createMedication("atorvastatin 20mg tablet"),
        createAnswers({ lastPrescribedTimeframe: "less_3_months" })
      )
      
      expect(result.passed).toBe(true)
    })
  })
})

// ============================================================================
// SUGGESTED DECISION TESTS
// ============================================================================

describe("generateSuggestedDecision", () => {
  it("should suggest approval for eligible requests", () => {
    const eligibility = checkEligibility(
      createMedication("atorvastatin 20mg tablet"),
      createAnswers()
    )
    
    const decision = generateSuggestedDecision(eligibility)
    
    expect(decision.recommendation).toBe("approve")
    expect(decision.suggestedRepeats).toBe(1)
  })
  
  it("should suggest decline for excluded medications", () => {
    const eligibility = checkEligibility(
      createMedication("oxycodone 10mg tablet"),
      createAnswers()
    )
    
    const decision = generateSuggestedDecision(eligibility)
    
    expect(decision.recommendation).toBe("decline")
    expect(decision.suggestedRepeats).toBe(0)
  })
  
  it("should suggest consult for flagged but proceedable requests", () => {
    const eligibility = checkEligibility(
      createMedication("atorvastatin 20mg tablet"),
      createAnswers({ sideEffects: "significant" })
    )
    
    const decision = generateSuggestedDecision(eligibility)
    
    expect(decision.recommendation).toBe("consult")
    expect(decision.suggestedRepeats).toBe(0)
  })
})
