/**
 * Safety Rules Engine Tests
 *
 * Comprehensive tests for the safety & eligibility engine that gates intake flows.
 * Covers: emergency rules, med cert rules, outcome priority, server-side checks,
 * field validation, additional info re-evaluation, and evaluation metadata.
 */

import { describe, expect,it } from "vitest"

import {
  checkSafetyForServer,
  evaluateSafety,
  evaluateSafetyWithAdditionalInfo,
  validateSafetyFieldsPresent,
} from "@/lib/safety"

// ============================================
// HELPERS
// ============================================

/** Today as YYYY-MM-DD */
function today(): string {
  return new Date().toISOString().split("T")[0]
}

/** Returns a date string offset from today by `days` (negative = past, positive = future) */
function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

// ============================================
// EMERGENCY RULES
// ============================================

describe("Safety Rules Engine", () => {
  describe("Emergency rules", () => {
    it("should DECLINE when chest pain is reported", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
      expect(
        result.triggeredRules.some((r) => r.ruleId === "emergency_chest_pain")
      ).toBe(true)
    })

    it("should DECLINE when breathing difficulty is reported", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["difficulty_breathing"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
      expect(
        result.triggeredRules.some((r) => r.ruleId === "emergency_breathing")
      ).toBe(true)
    })

    it("should DECLINE when suicidal thoughts are reported", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["suicidal_thoughts"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
      expect(result.patientMessage).toContain("Lifeline")
    })

    it("should DECLINE when stroke symptoms are reported", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["sudden_weakness"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "emergency_stroke_symptoms"
        )
      ).toBe(true)
    })

    it("should DECLINE when severe headache is reported", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["severe_headache"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
      expect(
        result.triggeredRules.some((r) => r.ruleId === "emergency_headache")
      ).toBe(true)
    })

    it("should DECLINE when multiple emergency symptoms are reported", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["chest_pain", "difficulty_breathing"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
      // Both emergency rules should trigger
      expect(result.triggeredRules.length).toBeGreaterThanOrEqual(2)
    })

    it("emergency rules apply across all service types", () => {
      const services = [
        "medical-certificate",
        "prescription",
        "consult",
        "weight-management",
      ]
      for (const service of services) {
        const result = evaluateSafety(service, {
          emergency_symptoms: ["chest_pain"],
        })
        expect(result.outcome).toBe("DECLINE")
        expect(result.riskTier).toBe("critical")
      }
    })
  })

  // ============================================
  // MEDICAL CERTIFICATE RULES
  // ============================================

  describe("Medical certificate rules", () => {
    it("should ALLOW standard med cert request with no red flags", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: today(),
        end_date: today(),
      })
      expect(result.outcome).toBe("ALLOW")
      expect(result.riskTier).toBe("low")
      expect(result.triggeredRules).toHaveLength(0)
    })

    it("should DECLINE excessive backdating (>7 days)", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: offsetDate(-10),
      })
      expect(result.outcome).toBe("DECLINE")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "medcert_backdated_excessive"
        )
      ).toBe(true)
    })

    it("should REQUIRES_CALL for backdating >3 days but <=7 days", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: offsetDate(-5),
      })
      // 5 days back triggers backdated_long (>3 days) but not excessive (>7 days)
      expect(result.outcome).toBe("REQUIRES_CALL")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "medcert_backdated_long"
        )
      ).toBe(true)
    })

    it("should DECLINE future-dated certificates", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: offsetDate(3),
      })
      expect(result.outcome).toBe("DECLINE")
      expect(
        result.triggeredRules.some((r) => r.ruleId === "medcert_future_date")
      ).toBe(true)
    })

    it("should REQUEST_MORE_INFO for extended duration (>5 days)", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: today(),
        end_date: offsetDate(7),
      })
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "medcert_extended_duration"
        )
      ).toBe(true)
      // Extended duration triggers REQUEST_MORE_INFO
      expect(result.outcome).toBe("REQUEST_MORE_INFO")
      expect(result.additionalInfoRequired.length).toBeGreaterThan(0)
    })

    it("should not trigger backdating for start_date of today", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: today(),
        end_date: today(),
      })
      expect(
        result.triggeredRules.some(
          (r) =>
            r.ruleId === "medcert_backdated_excessive" ||
            r.ruleId === "medcert_backdated_long"
        )
      ).toBe(false)
    })

    it("should not trigger backdating for 1-day backdated cert", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: offsetDate(-1),
        end_date: today(),
      })
      expect(
        result.triggeredRules.some(
          (r) =>
            r.ruleId === "medcert_backdated_excessive" ||
            r.ruleId === "medcert_backdated_long"
        )
      ).toBe(false)
    })

    it("should work with med cert service aliases", () => {
      const aliases = [
        "medical-certificate",
        "med-cert",
        "med-cert-sick",
        "med-cert-carer",
        "med-cert-fitness",
        "sick-certificate",
      ]
      for (const alias of aliases) {
        const result = evaluateSafety(alias, {
          emergency_symptoms: ["chest_pain"],
        })
        expect(result.outcome).toBe("DECLINE")
      }
    })
  })

  // ============================================
  // OUTCOME PRIORITY
  // ============================================

  describe("Outcome priority", () => {
    it("DECLINE should override REQUIRES_CALL when both trigger", () => {
      // Emergency symptom (DECLINE) + backdating (REQUIRES_CALL)
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
        start_date: offsetDate(-5),
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
    })

    it("DECLINE should override REQUEST_MORE_INFO when both trigger", () => {
      // Emergency symptom (DECLINE) + extended duration (REQUEST_MORE_INFO)
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
        start_date: today(),
        end_date: offsetDate(7),
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
    })

    it("REQUIRES_CALL should override REQUEST_MORE_INFO when both trigger", () => {
      // Backdating >3 days (REQUIRES_CALL) + extended duration (REQUEST_MORE_INFO)
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: offsetDate(-5),
        end_date: offsetDate(3), // 8-day duration from start
      })
      expect(result.outcome).toBe("REQUIRES_CALL")
    })
  })

  // ============================================
  // PRESCRIPTION RULES
  // ============================================

  describe("Prescription rules", () => {
    it("should ALLOW a standard repeat prescription request", () => {
      const result = evaluateSafety("prescription", {
        emergency_symptoms: [],
        prescriptionHistory: "repeat",
      })
      expect(result.outcome).toBe("ALLOW")
    })

    it("should REQUIRES_CALL for new chronic medication", () => {
      const result = evaluateSafety("prescription", {
        emergency_symptoms: [],
        prescriptionHistory: "first_time",
        conditions: ["diabetes"],
      })
      expect(result.outcome).toBe("REQUIRES_CALL")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "rx_new_chronic_medication"
        )
      ).toBe(true)
    })

    it("should REQUEST_MORE_INFO for multiple medical conditions", () => {
      const result = evaluateSafety("prescription", {
        emergency_symptoms: [],
        conditions: ["diabetes", "hypertension", "asthma"],
      })
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "rx_multiple_conditions"
        )
      ).toBe(true)
    })

    it("prescription service aliases all use the same config", () => {
      const aliases = [
        "prescription",
        "repeat-prescription",
        "repeat-scripts",
        "common-scripts",
        "script-renewal",
      ]
      for (const alias of aliases) {
        const result = evaluateSafety(alias, {
          emergency_symptoms: ["chest_pain"],
        })
        expect(result.outcome).toBe("DECLINE")
      }
    })
  })

  // ============================================
  // CONSULT / ED RULES
  // ============================================

  describe("Consult rules", () => {
    it("should DECLINE ED consult when patient takes nitrates", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultSubtype: "ed",
        edNitrates: true,
      })
      expect(result.outcome).toBe("DECLINE")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "ed_nitrate_contraindication"
        )
      ).toBe(true)
    })

    it("should DECLINE ED consult with recent cardiac event without GP clearance", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultSubtype: "ed",
        edRecentHeartEvent: true,
        edGpCleared: false,
      })
      expect(result.outcome).toBe("DECLINE")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "ed_recent_cardiac_event"
        )
      ).toBe(true)
    })

    it("should ALLOW ED consult with GP-cleared recent cardiac event for doctor review", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultSubtype: "ed",
        edNitrates: false,
        edRecentHeartEvent: true,
        edSevereHeart: false,
        edGpCleared: true,
      })
      expect(result.outcome).toBe("ALLOW")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "ed_recent_cardiac_event"
        )
      ).toBe(false)
    })

    it("should REQUIRES_CALL for ED consult with severe heart condition without GP clearance", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultSubtype: "ed",
        edSevereHeart: true,
        edGpCleared: false,
      })
      expect(result.outcome).toBe("REQUIRES_CALL")
      expect(
        result.triggeredRules.some((r) => r.ruleId === "ed_uncontrolled_bp")
      ).toBe(true)
    })

    it("should ALLOW ED consult with GP-cleared severe heart condition for doctor review", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultSubtype: "ed",
        edNitrates: false,
        edRecentHeartEvent: false,
        edSevereHeart: true,
        edGpCleared: true,
      })
      expect(result.outcome).toBe("ALLOW")
      expect(
        result.triggeredRules.some((r) => r.ruleId === "ed_uncontrolled_bp")
      ).toBe(false)
    })

    it("should DECLINE general consult with chest pain symptom", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultCategory: "general",
        general_associated_symptoms: ["chest_pain"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
    })

    it("should DECLINE general consult with suicidal ideation", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultCategory: "general",
        general_associated_symptoms: ["suicidal_thoughts"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.patientMessage).toContain("Lifeline")
    })

    it("should REQUIRES_CALL for pregnancy concern in general consult", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultCategory: "general",
        isPregnantOrBreastfeeding: true,
      })
      expect(result.outcome).toBe("REQUIRES_CALL")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "general_pregnancy_concern"
        )
      ).toBe(true)
    })

    it("should DECLINE women's health with pregnancy + hormonal medication", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultSubtype: "womens_health",
        pregnancyStatus: "pregnant",
        contraceptionType: "combined_pill",
      })
      expect(result.outcome).toBe("DECLINE")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "womens_pregnancy_hormonal"
        )
      ).toBe(true)
    })

    it("should REQUIRES_CALL for breastfeeding with hormonal medication", () => {
      const result = evaluateSafety("consult", {
        emergency_symptoms: [],
        consultSubtype: "womens_health",
        pregnancyStatus: "breastfeeding",
        contraceptionType: "combined_pill",
      })
      expect(result.outcome).toBe("REQUIRES_CALL")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "womens_breastfeeding_hormonal"
        )
      ).toBe(true)
    })
  })

  // ============================================
  // WEIGHT MANAGEMENT RULES
  // ============================================

  describe("Weight management rules", () => {
    it("should ALLOW standard weight management request", () => {
      const result = evaluateSafety("weight-management", {
        emergency_symptoms: [],
        currentWeight: 100,
        currentHeight: 175,
      })
      expect(result.outcome).toBe("ALLOW")
    })

    it("should DECLINE when BMI is below 27", () => {
      // BMI = 70 / (1.75^2) = 22.86
      const result = evaluateSafety("weight-management", {
        emergency_symptoms: [],
        currentWeight: 70,
        currentHeight: 175,
      })
      expect(result.outcome).toBe("DECLINE")
      expect(
        result.triggeredRules.some((r) => r.ruleId === "weight_low_bmi")
      ).toBe(true)
    })

    it("should REQUIRES_CALL for eating disorder history", () => {
      const result = evaluateSafety("weight-management", {
        emergency_symptoms: [],
        eatingDisorderHistory: "yes",
        currentWeight: 100,
        currentHeight: 175,
      })
      expect(result.outcome).toBe("REQUIRES_CALL")
      expect(
        result.triggeredRules.some(
          (r) => r.ruleId === "weight_eating_disorder"
        )
      ).toBe(true)
    })

    it("should REQUIRES_CALL for heart disease", () => {
      const result = evaluateSafety("weight-management", {
        emergency_symptoms: [],
        wlHistoryHeartCondition: true,
        currentWeight: 100,
        currentHeight: 175,
      })
      expect(result.outcome).toBe("REQUIRES_CALL")
      expect(
        result.triggeredRules.some((r) => r.ruleId === "weight_heart_disease")
      ).toBe(true)
    })
  })

  // ============================================
  // checkSafetyForServer
  // ============================================

  describe("checkSafetyForServer", () => {
    it("returns isAllowed: true for safe requests", () => {
      const result = checkSafetyForServer("medical-certificate", {
        emergency_symptoms: [],
        start_date: today(),
        end_date: today(),
      })
      expect(result.isAllowed).toBe(true)
      expect(result.outcome).toBe("ALLOW")
      expect(result.blockReason).toBeUndefined()
      expect(result.requiresCall).toBe(false)
      expect(result.triggeredRuleIds).toHaveLength(0)
    })

    it("returns isAllowed: false for dangerous requests", () => {
      const result = checkSafetyForServer("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
      })
      expect(result.isAllowed).toBe(false)
      expect(result.outcome).toBe("DECLINE")
      expect(result.blockReason).toBeDefined()
      expect(result.riskTier).toBe("critical")
    })

    it("sets requiresCall for REQUIRES_CALL outcomes", () => {
      const result = checkSafetyForServer("medical-certificate", {
        emergency_symptoms: [],
        start_date: offsetDate(-5),
      })
      expect(result.requiresCall).toBe(true)
      expect(result.isAllowed).toBe(false)
      expect(result.outcome).toBe("REQUIRES_CALL")
    })

    it("returns isAllowed: false for REQUEST_MORE_INFO outcomes", () => {
      const result = checkSafetyForServer("medical-certificate", {
        emergency_symptoms: [],
        start_date: today(),
        end_date: offsetDate(7),
      })
      expect(result.isAllowed).toBe(false)
      expect(result.outcome).toBe("REQUEST_MORE_INFO")
      expect(result.requiresCall).toBe(false)
    })

    it("returns triggered rule IDs", () => {
      const result = checkSafetyForServer("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
      })
      expect(result.triggeredRuleIds).toContain("emergency_chest_pain")
    })
  })

  // ============================================
  // MISSING / NULL FIELD HANDLING
  // ============================================

  describe("Missing/null field handling", () => {
    it("should not trigger rules when fields are missing (fail-safe)", () => {
      const result = evaluateSafety("medical-certificate", {})
      expect(result.outcome).toBe("ALLOW")
      expect(result.triggeredRules).toHaveLength(0)
    })

    it("should handle null values without crashing", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: null,
        start_date: null,
      })
      expect(result.outcome).toBe("ALLOW")
    })

    it("should handle undefined values without crashing", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: undefined,
        start_date: undefined,
        end_date: undefined,
      })
      expect(result.outcome).toBe("ALLOW")
    })

    it("should handle empty emergency symptoms array as safe", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
      })
      expect(result.outcome).toBe("ALLOW")
    })
  })

  // ============================================
  // UNKNOWN SERVICE
  // ============================================

  describe("Unknown service", () => {
    it("should default to ALLOW for unknown service slugs", () => {
      const result = evaluateSafety("unknown-service-xyz", {
        emergency_symptoms: ["chest_pain"],
      })
      expect(result.outcome).toBe("ALLOW")
      expect(result.riskTier).toBe("low")
      expect(result.triggeredRules).toHaveLength(0)
    })

    it("should return empty triggered rules for unknown services", () => {
      const result = evaluateSafety("nonexistent", {
        start_date: offsetDate(-100),
      })
      expect(result.triggeredRules).toHaveLength(0)
    })
  })

  // ============================================
  // validateSafetyFieldsPresent
  // ============================================

  describe("validateSafetyFieldsPresent", () => {
    it("returns valid for complete answers", () => {
      const result = validateSafetyFieldsPresent("medical-certificate", {
        emergency_symptoms: [],
        start_date: "2026-03-29",
      })
      expect(result.valid).toBe(true)
      expect(result.missingFields).toHaveLength(0)
    })

    it("returns valid for unknown services", () => {
      const result = validateSafetyFieldsPresent("nonexistent", {})
      expect(result.valid).toBe(true)
      expect(result.missingFields).toHaveLength(0)
    })

    it("returns valid when no fields are marked as requiredForSafety", () => {
      // The current rule set does not mark any field as requiredForSafety,
      // so even an empty answers object should pass validation.
      const result = validateSafetyFieldsPresent("medical-certificate", {})
      expect(result.valid).toBe(true)
    })
  })

  // ============================================
  // evaluateSafetyWithAdditionalInfo
  // ============================================

  describe("evaluateSafetyWithAdditionalInfo", () => {
    it("re-evaluates with merged answers", () => {
      const result = evaluateSafetyWithAdditionalInfo(
        "medical-certificate",
        {
          emergency_symptoms: [],
          start_date: today(),
          end_date: offsetDate(7),
        },
        {
          extended_reason: "Recovering from surgery",
          gp_contact: "yes_recent",
        }
      )
      expect(result).toBeDefined()
      expect(result.outcome).toBeDefined()
    })

    it("preserves emergency decline even with additional info", () => {
      const result = evaluateSafetyWithAdditionalInfo(
        "medical-certificate",
        {
          emergency_symptoms: ["chest_pain"],
        },
        {
          some_extra_info: "does not matter",
        }
      )
      expect(result.outcome).toBe("DECLINE")
      expect(result.riskTier).toBe("critical")
    })

    it("merges additional info into the answers snapshot", () => {
      const result = evaluateSafetyWithAdditionalInfo(
        "medical-certificate",
        { emergency_symptoms: [] },
        { extended_reason: "Surgery recovery" }
      )
      expect(result.answersSnapshot).toHaveProperty("extended_reason")
      expect(result.answersSnapshot).toHaveProperty(
        "_additionalInfoProvided",
        true
      )
    })
  })

  // ============================================
  // EVALUATION METADATA
  // ============================================

  describe("Evaluation metadata", () => {
    it("includes timing information", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
      })
      expect(result.evaluationDurationMs).toBeGreaterThanOrEqual(0)
      expect(result.evaluatedAt).toBeTruthy()
      // evaluatedAt should be a valid ISO string
      expect(new Date(result.evaluatedAt).toISOString()).toBe(
        result.evaluatedAt
      )
    })

    it("includes answers snapshot", () => {
      const answers = { emergency_symptoms: ["chest_pain"] }
      const result = evaluateSafety("medical-certificate", answers)
      expect(result.answersSnapshot).toEqual(answers)
    })

    it("answers snapshot is a copy, not a reference", () => {
      const answers: Record<string, unknown> = {
        emergency_symptoms: ["chest_pain"],
      }
      const result = evaluateSafety("medical-certificate", answers)
      answers.emergency_symptoms = []
      expect(result.answersSnapshot.emergency_symptoms).toEqual(["chest_pain"])
    })

    it("triggered rules include field values", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
      })
      const rule = result.triggeredRules.find(
        (r) => r.ruleId === "emergency_chest_pain"
      )
      expect(rule).toBeDefined()
      expect(rule!.fieldValues).toBeDefined()
      expect(rule!.fieldValues.emergency_symptoms).toEqual(["chest_pain"])
    })

    it("includes patient title matching outcome", () => {
      const allowed = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
      })
      expect(allowed.patientTitle).toContain("all set")

      const declined = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
      })
      expect(declined.patientTitle).toContain("can't help")
    })

    it("includes patient message for triggered rules", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
      })
      expect(result.patientMessage).toBeTruthy()
      expect(result.patientMessage.length).toBeGreaterThan(10)
    })
  })

  // ============================================
  // ADDITIONAL INFO ITEMS
  // ============================================

  describe("Additional info items", () => {
    it("includes additionalInfoRequired for REQUEST_MORE_INFO outcome", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: today(),
        end_date: offsetDate(7),
      })
      expect(result.outcome).toBe("REQUEST_MORE_INFO")
      expect(result.additionalInfoRequired.length).toBeGreaterThan(0)

      // Should include extended_reason and gp_contact items
      const itemIds = result.additionalInfoRequired.map((item) => item.id)
      expect(itemIds).toContain("extended_reason")
      expect(itemIds).toContain("gp_contact")
    })

    it("additionalInfoRequired is empty for ALLOW outcome", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: today(),
        end_date: today(),
      })
      expect(result.outcome).toBe("ALLOW")
      expect(result.additionalInfoRequired).toHaveLength(0)
    })

    it("additionalInfoRequired is empty for DECLINE outcome", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: ["chest_pain"],
      })
      expect(result.outcome).toBe("DECLINE")
      expect(result.additionalInfoRequired).toHaveLength(0)
    })

    it("additional info items have required structure", () => {
      const result = evaluateSafety("medical-certificate", {
        emergency_symptoms: [],
        start_date: today(),
        end_date: offsetDate(7),
      })
      for (const item of result.additionalInfoRequired) {
        expect(item.id).toBeTruthy()
        expect(item.label).toBeTruthy()
        expect(typeof item.required).toBe("boolean")
        expect(["text", "textarea", "file", "photo", "select"]).toContain(
          item.type
        )
      }
    })
  })
})
