import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the triage-rules-engine before importing the module under test
vi.mock("@/lib/clinical/triage-rules-engine", () => ({
  checkEmergencySymptoms: vi.fn().mockReturnValue({ isEmergency: false, matchedKeywords: [] }),
  checkRedFlagPatterns: vi.fn().mockReturnValue([]),
  checkAutoReject: vi.fn().mockReturnValue({ shouldReject: false }),
}))

import {
  quickEmergencyCheck,
  isControlledSubstance,
  isHighRiskFirstTime,
  isOutsideGPScope,
  validateIntake,
  EMERGENCY_SYMPTOM_PATTERNS,
  CONTROLLED_SUBSTANCE_DISCLAIMER,
  COMMONLY_ABUSED_MEDICATIONS,
} from "@/lib/clinical/intake-validation"
import {
  checkEmergencySymptoms,
  checkRedFlagPatterns,
  checkAutoReject,
} from "@/lib/clinical/triage-rules-engine"
import { AUTO_REJECT_RULES } from "@/lib/clinical/triage-types"
import type { ClinicalFlag } from "@/lib/clinical/triage-types"

// ============================================================================
// quickEmergencyCheck
// ============================================================================

describe("quickEmergencyCheck", () => {
  describe("cardiac / breathing emergencies", () => {
    it("detects 'chest pain'", () => {
      const result = quickEmergencyCheck("I have chest pain")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Chest pain requires immediate emergency care")
    })

    it("detects 'chest pain' with extra whitespace", () => {
      const result = quickEmergencyCheck("chest  pain on the left side")
      expect(result.isEmergency).toBe(true)
    })

    it("detects 'can't breathe'", () => {
      const result = quickEmergencyCheck("I can't breathe properly")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Difficulty breathing requires immediate emergency care")
    })

    it("detects 'cant breathe' without apostrophe", () => {
      const result = quickEmergencyCheck("I cant breathe")
      expect(result.isEmergency).toBe(true)
    })

    it("detects 'heart attack'", () => {
      const result = quickEmergencyCheck("I think I'm having a heart attack")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Suspected heart attack - call 000 immediately")
    })
  })

  describe("mental health emergencies", () => {
    it("detects 'suicidal'", () => {
      const result = quickEmergencyCheck("I feel suicidal")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe(
        "If you're having thoughts of suicide, please call Lifeline 13 11 14 or 000"
      )
    })

    it("detects 'suicide'", () => {
      const result = quickEmergencyCheck("thinking about suicide")
      expect(result.isEmergency).toBe(true)
    })

    it("detects 'self-harm'", () => {
      const result = quickEmergencyCheck("I've been self-harming")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe(
        "If you're thinking of hurting yourself, please call Lifeline 13 11 14"
      )
    })

    it("detects 'selfharm' without hyphen", () => {
      const result = quickEmergencyCheck("selfharm thoughts")
      expect(result.isEmergency).toBe(true)
    })
  })

  describe("neurological emergencies", () => {
    it("detects 'stroke'", () => {
      const result = quickEmergencyCheck("I think I'm having a stroke")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Suspected stroke - call 000 immediately")
    })

    it("detects 'seizure'", () => {
      const result = quickEmergencyCheck("I just had a seizure")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Active seizures require immediate emergency care")
    })

    it("detects 'unconscious'", () => {
      const result = quickEmergencyCheck("my partner is unconscious")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Unconsciousness requires immediate emergency care")
    })
  })

  describe("other emergencies", () => {
    it("detects 'severe bleeding'", () => {
      const result = quickEmergencyCheck("I have severe bleeding")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Severe bleeding requires immediate emergency care")
    })

    it("detects 'overdose'", () => {
      const result = quickEmergencyCheck("I think it's an overdose")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Suspected overdose - call 000 immediately")
    })

    it("detects 'anaphylaxis'", () => {
      const result = quickEmergencyCheck("having anaphylaxis")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Severe allergic reaction - call 000 immediately")
    })

    it("detects 'choking'", () => {
      const result = quickEmergencyCheck("someone is choking")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Choking requires immediate emergency care")
    })

    it("detects 'throat closing'", () => {
      const result = quickEmergencyCheck("my throat closing up")
      expect(result.isEmergency).toBe(true)
      expect(result.message).toBe("Throat closing - call 000 immediately")
    })

    it("detects 'throatclosing' without space", () => {
      const result = quickEmergencyCheck("throatclosing sensation")
      expect(result.isEmergency).toBe(true)
    })
  })

  describe("case insensitivity", () => {
    it("detects uppercase 'CHEST PAIN'", () => {
      const result = quickEmergencyCheck("I HAVE CHEST PAIN")
      expect(result.isEmergency).toBe(true)
    })

    it("detects mixed case 'Seizure'", () => {
      const result = quickEmergencyCheck("Having a Seizure")
      expect(result.isEmergency).toBe(true)
    })
  })

  describe("non-emergency text passes", () => {
    it("returns false for headache", () => {
      const result = quickEmergencyCheck("I have a headache")
      expect(result.isEmergency).toBe(false)
      expect(result.message).toBeUndefined()
    })

    it("returns false for cold symptoms", () => {
      const result = quickEmergencyCheck("runny nose and sore throat")
      expect(result.isEmergency).toBe(false)
    })

    it("returns false for back pain", () => {
      const result = quickEmergencyCheck("lower back pain for 3 days")
      expect(result.isEmergency).toBe(false)
    })

    it("returns false for empty string", () => {
      const result = quickEmergencyCheck("")
      expect(result.isEmergency).toBe(false)
    })
  })
})

// ============================================================================
// isControlledSubstance
// ============================================================================

describe("isControlledSubstance", () => {
  describe("S8 opioids", () => {
    it("detects oxycodone", () => {
      expect(isControlledSubstance("oxycodone")).toBe(true)
    })

    it("detects OxyContin (brand name)", () => {
      expect(isControlledSubstance("OxyContin")).toBe(true)
    })

    it("detects Endone (brand name)", () => {
      expect(isControlledSubstance("Endone")).toBe(true)
    })

    it("detects morphine", () => {
      expect(isControlledSubstance("morphine 10mg")).toBe(true)
    })

    it("detects fentanyl", () => {
      expect(isControlledSubstance("fentanyl patch")).toBe(true)
    })

    it("detects Durogesic (fentanyl brand)", () => {
      expect(isControlledSubstance("Durogesic")).toBe(true)
    })

    it("detects tramadol", () => {
      expect(isControlledSubstance("tramadol")).toBe(true)
    })

    it("detects hydromorphone", () => {
      expect(isControlledSubstance("hydromorphone")).toBe(true)
    })

    it("detects methadone", () => {
      expect(isControlledSubstance("methadone")).toBe(true)
    })

    it("detects buprenorphine / Suboxone", () => {
      expect(isControlledSubstance("suboxone")).toBe(true)
      expect(isControlledSubstance("buprenorphine")).toBe(true)
    })
  })

  describe("S8 stimulants", () => {
    it("detects dexamphetamine", () => {
      expect(isControlledSubstance("dexamphetamine")).toBe(true)
    })

    it("detects Vyvanse (lisdexamfetamine)", () => {
      expect(isControlledSubstance("Vyvanse")).toBe(true)
    })

    it("detects methylphenidate", () => {
      expect(isControlledSubstance("methylphenidate")).toBe(true)
    })

    it("detects Ritalin", () => {
      expect(isControlledSubstance("Ritalin")).toBe(true)
    })

    it("detects Concerta", () => {
      expect(isControlledSubstance("Concerta")).toBe(true)
    })
  })

  describe("benzodiazepines", () => {
    it("detects alprazolam / Xanax", () => {
      expect(isControlledSubstance("alprazolam")).toBe(true)
      expect(isControlledSubstance("xanax")).toBe(true)
    })

    it("detects diazepam / Valium", () => {
      expect(isControlledSubstance("diazepam")).toBe(true)
      expect(isControlledSubstance("Valium")).toBe(true)
    })

    it("detects temazepam", () => {
      expect(isControlledSubstance("temazepam")).toBe(true)
    })

    it("detects clonazepam", () => {
      expect(isControlledSubstance("clonazepam")).toBe(true)
    })

    it("detects lorazepam / Ativan", () => {
      expect(isControlledSubstance("lorazepam")).toBe(true)
      expect(isControlledSubstance("Ativan")).toBe(true)
    })

    it("detects nitrazepam / Mogadon", () => {
      expect(isControlledSubstance("nitrazepam")).toBe(true)
      expect(isControlledSubstance("mogadon")).toBe(true)
    })
  })

  describe("Z-drugs", () => {
    it("detects zolpidem / Stilnox", () => {
      expect(isControlledSubstance("zolpidem")).toBe(true)
      expect(isControlledSubstance("Stilnox")).toBe(true)
    })

    it("detects zopiclone / Imovane", () => {
      expect(isControlledSubstance("zopiclone")).toBe(true)
      expect(isControlledSubstance("Imovane")).toBe(true)
    })
  })

  describe("cannabis", () => {
    it("detects cannabis", () => {
      expect(isControlledSubstance("cannabis")).toBe(true)
    })

    it("detects THC", () => {
      expect(isControlledSubstance("THC")).toBe(true)
    })

    it("detects CBD oil", () => {
      expect(isControlledSubstance("CBD oil")).toBe(true)
    })

    it("detects cannabidiol", () => {
      expect(isControlledSubstance("cannabidiol")).toBe(true)
    })

    it("detects Sativex", () => {
      expect(isControlledSubstance("Sativex")).toBe(true)
    })
  })

  describe("testosterone", () => {
    it("detects testosterone", () => {
      expect(isControlledSubstance("testosterone")).toBe(true)
    })

    it("detects Sustanon", () => {
      expect(isControlledSubstance("Sustanon")).toBe(true)
    })

    it("detects Reandron", () => {
      expect(isControlledSubstance("Reandron")).toBe(true)
    })

    it("detects Testogel", () => {
      expect(isControlledSubstance("Testogel")).toBe(true)
    })
  })

  describe("case insensitivity", () => {
    it("detects OXYCODONE in all caps", () => {
      expect(isControlledSubstance("OXYCODONE")).toBe(true)
    })

    it("detects 'Diazepam' with initial cap", () => {
      expect(isControlledSubstance("Diazepam")).toBe(true)
    })
  })

  describe("safe medications pass through", () => {
    it("allows paracetamol", () => {
      expect(isControlledSubstance("paracetamol")).toBe(false)
    })

    it("allows ibuprofen", () => {
      expect(isControlledSubstance("ibuprofen")).toBe(false)
    })

    it("allows amoxicillin", () => {
      expect(isControlledSubstance("amoxicillin")).toBe(false)
    })

    it("allows metformin", () => {
      expect(isControlledSubstance("metformin")).toBe(false)
    })

    it("allows salbutamol / Ventolin", () => {
      expect(isControlledSubstance("salbutamol")).toBe(false)
      expect(isControlledSubstance("Ventolin")).toBe(false)
    })

    it("allows atorvastatin", () => {
      expect(isControlledSubstance("atorvastatin")).toBe(false)
    })
  })
})

// ============================================================================
// isHighRiskFirstTime
// ============================================================================

describe("isHighRiskFirstTime", () => {
  describe("returns false when not first prescription", () => {
    it("returns false for anticoagulant repeat", () => {
      expect(isHighRiskFirstTime("anticoagulant", false)).toBe(false)
    })

    it("returns false for insulin repeat", () => {
      expect(isHighRiskFirstTime("insulin glargine", false)).toBe(false)
    })

    it("returns false for methotrexate repeat", () => {
      expect(isHighRiskFirstTime("methotrexate", false)).toBe(false)
    })
  })

  describe("detects high-risk first-time categories", () => {
    it("flags anticoagulant", () => {
      expect(isHighRiskFirstTime("anticoagulant therapy", true)).toBe(true)
    })

    it("flags immunosuppressant", () => {
      expect(isHighRiskFirstTime("immunosuppressant agent", true)).toBe(true)
    })

    it("flags antiepileptic", () => {
      expect(isHighRiskFirstTime("antiepileptic medication", true)).toBe(true)
    })

    it("flags antipsychotic", () => {
      expect(isHighRiskFirstTime("antipsychotic", true)).toBe(true)
    })

    it("flags lithium", () => {
      expect(isHighRiskFirstTime("lithium carbonate", true)).toBe(true)
    })

    it("flags methotrexate", () => {
      expect(isHighRiskFirstTime("methotrexate", true)).toBe(true)
    })

    it("flags insulin", () => {
      expect(isHighRiskFirstTime("insulin", true)).toBe(true)
    })

    it("flags biologics", () => {
      expect(isHighRiskFirstTime("biologics treatment", true)).toBe(true)
    })
  })

  describe("safe medications pass even for first prescription", () => {
    it("allows paracetamol first time", () => {
      expect(isHighRiskFirstTime("paracetamol", true)).toBe(false)
    })

    it("allows amoxicillin first time", () => {
      expect(isHighRiskFirstTime("amoxicillin", true)).toBe(false)
    })

    it("allows omeprazole first time", () => {
      expect(isHighRiskFirstTime("omeprazole", true)).toBe(false)
    })
  })

  describe("case insensitivity", () => {
    it("detects INSULIN in uppercase", () => {
      expect(isHighRiskFirstTime("INSULIN", true)).toBe(true)
    })

    it("detects Lithium with initial cap", () => {
      expect(isHighRiskFirstTime("Lithium", true)).toBe(true)
    })
  })
})

// ============================================================================
// isOutsideGPScope
// ============================================================================

describe("isOutsideGPScope", () => {
  describe("detects out-of-scope requests", () => {
    it("detects chemotherapy", () => {
      expect(isOutsideGPScope("I need chemotherapy")).toBe(true)
    })

    it("detects radiation therapy", () => {
      expect(isOutsideGPScope("radiation therapy session")).toBe(true)
    })

    it("detects dialysis", () => {
      expect(isOutsideGPScope("I require dialysis")).toBe(true)
    })

    it("detects organ transplant", () => {
      expect(isOutsideGPScope("organ transplant follow-up")).toBe(true)
    })

    it("detects surgical procedure", () => {
      expect(isOutsideGPScope("need a surgical procedure")).toBe(true)
    })

    it("detects IV infusion", () => {
      expect(isOutsideGPScope("IV infusion therapy")).toBe(true)
    })

    it("detects specialist only requests", () => {
      expect(isOutsideGPScope("this is specialist only")).toBe(true)
    })
  })

  describe("case insensitivity", () => {
    it("detects CHEMOTHERAPY in all caps", () => {
      expect(isOutsideGPScope("CHEMOTHERAPY treatment")).toBe(true)
    })

    it("detects Dialysis with initial cap", () => {
      expect(isOutsideGPScope("Dialysis appointment")).toBe(true)
    })
  })

  describe("normal requests pass through", () => {
    it("allows cold and flu", () => {
      expect(isOutsideGPScope("I have a cold and flu")).toBe(false)
    })

    it("allows back pain", () => {
      expect(isOutsideGPScope("lower back pain")).toBe(false)
    })

    it("allows skin rash", () => {
      expect(isOutsideGPScope("I have a skin rash")).toBe(false)
    })

    it("allows prescription refill", () => {
      expect(isOutsideGPScope("need a prescription refill")).toBe(false)
    })

    it("allows medical certificate request", () => {
      expect(isOutsideGPScope("medical certificate for work")).toBe(false)
    })
  })
})

// ============================================================================
// validateIntake
// ============================================================================

describe("validateIntake", () => {
  beforeEach(() => {
    vi.mocked(checkEmergencySymptoms).mockReturnValue({ isEmergency: false, matchedKeywords: [] })
    vi.mocked(checkRedFlagPatterns).mockReturnValue([])
    vi.mocked(checkAutoReject).mockReturnValue({ shouldReject: false })
  })

  it("allows intake when all checks pass", () => {
    const result = validateIntake({ freeTextSymptoms: "I have a headache" })
    expect(result.canProceed).toBe(true)
    expect(result.requiresRedirection).toBe(false)
    expect(result.warnings).toEqual([])
    expect(result.flags).toEqual([])
  })

  it("allows intake with empty input", () => {
    const result = validateIntake({})
    expect(result.canProceed).toBe(true)
    expect(result.requiresRedirection).toBe(false)
  })

  it("redirects when auto-reject fires for controlled substance", () => {
    vi.mocked(checkAutoReject).mockReturnValue({
      shouldReject: true,
      category: "controlled_substance",
    })

    const result = validateIntake({
      freeTextSymptoms: "I need oxycodone",
      isControlledSubstance: true,
    })

    expect(result.canProceed).toBe(false)
    expect(result.requiresRedirection).toBe(true)
    expect(result.redirectionCategory).toBe("controlled_substance")
    expect(result.redirectionMessage).toBe(
      AUTO_REJECT_RULES.controlled_substance.userMessage
    )
    expect(result.redirectionAdvice).toBe(
      AUTO_REJECT_RULES.controlled_substance.redirectAdvice
    )
  })

  it("redirects when auto-reject fires for emergency symptoms", () => {
    vi.mocked(checkAutoReject).mockReturnValue({
      shouldReject: true,
      category: "emergency_symptoms",
    })

    const result = validateIntake({ freeTextSymptoms: "chest pain" })

    expect(result.canProceed).toBe(false)
    expect(result.requiresRedirection).toBe(true)
    expect(result.redirectionCategory).toBe("emergency_symptoms")
    expect(result.redirectionMessage).toBe(
      AUTO_REJECT_RULES.emergency_symptoms.userMessage
    )
  })

  it("includes warning flags that are non-blocking", () => {
    const warningFlag: ClinicalFlag = {
      code: "WARN_001",
      severity: "warning",
      category: "symptom",
      description: "Symptom duration over 2 weeks",
      clinicianGuidance: "Review symptom timeline",
      forcesNeedsCall: false,
      forcesDecline: false,
    }
    vi.mocked(checkRedFlagPatterns).mockReturnValue([warningFlag])

    const result = validateIntake({ freeTextSymptoms: "headache for 3 weeks" })

    expect(result.canProceed).toBe(true)
    expect(result.requiresRedirection).toBe(false)
    expect(result.warnings).toContain("Symptom duration over 2 weeks")
    expect(result.flags).toHaveLength(1)
  })

  it("does not include non-warning flags in warnings array", () => {
    const infoFlag: ClinicalFlag = {
      code: "INFO_001",
      severity: "info",
      category: "general",
      description: "Patient mentioned allergies",
      clinicianGuidance: "Note allergies",
      forcesNeedsCall: false,
      forcesDecline: false,
    }
    vi.mocked(checkRedFlagPatterns).mockReturnValue([infoFlag])

    const result = validateIntake({ freeTextSymptoms: "I have allergies" })

    expect(result.canProceed).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.flags).toHaveLength(1)
  })

  it("passes isControlledSubstance flag to checkAutoReject", () => {
    validateIntake({ isControlledSubstance: true })
    expect(checkAutoReject).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      true,
      false,
      false
    )
  })

  it("passes isFirstTimeHighRisk flag to checkAutoReject", () => {
    validateIntake({ isFirstTimeHighRisk: true })
    expect(checkAutoReject).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      false,
      true,
      false
    )
  })

  it("passes isOutsideScope flag to checkAutoReject", () => {
    validateIntake({ isOutsideScope: true })
    expect(checkAutoReject).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      false,
      false,
      true
    )
  })
})

// ============================================================================
// Exported constants
// ============================================================================

describe("exported constants", () => {
  it("EMERGENCY_SYMPTOM_PATTERNS has 13 patterns", () => {
    expect(EMERGENCY_SYMPTOM_PATTERNS).toHaveLength(13)
  })

  it("every pattern has a message string", () => {
    for (const entry of EMERGENCY_SYMPTOM_PATTERNS) {
      expect(entry.pattern).toBeInstanceOf(RegExp)
      expect(typeof entry.message).toBe("string")
      expect(entry.message.length).toBeGreaterThan(0)
    }
  })

  it("CONTROLLED_SUBSTANCE_DISCLAIMER has expected structure", () => {
    expect(CONTROLLED_SUBSTANCE_DISCLAIMER.title).toBeTruthy()
    expect(CONTROLLED_SUBSTANCE_DISCLAIMER.message).toBeTruthy()
    expect(CONTROLLED_SUBSTANCE_DISCLAIMER.advice).toBeTruthy()
    expect(CONTROLLED_SUBSTANCE_DISCLAIMER.blockedCategories.length).toBeGreaterThan(0)
  })

  it("COMMONLY_ABUSED_MEDICATIONS includes key drugs", () => {
    const names = COMMONLY_ABUSED_MEDICATIONS.join(" ").toLowerCase()
    expect(names).toContain("oxycodone")
    expect(names).toContain("morphine")
    expect(names).toContain("diazepam")
    expect(names).toContain("testosterone")
    expect(names).toContain("cannabis")
  })
})
