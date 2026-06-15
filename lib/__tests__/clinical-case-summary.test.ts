import { describe, expect, it } from "vitest"

import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"

describe("buildClinicalCaseSummary", () => {
  it("turns an ED request into a patient story, plan, note, and Parchment prescribing intent", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "ed",
      serviceType: "consult",
      patientName: "Daniel McDonald",
      answers: {
        edGoal: "improve_erections",
        edDuration: "1_to_3_years",
        edPreference: "daily",
        iiefTotal: 12,
        edNitrates: "no",
        edRecentHeartEvent: "no",
        edSevereHeart: "no",
        edBpMedication: "no",
        edAlphaBlockers: "no",
        previousEdMeds: "no",
        has_allergies: "yes",
        known_allergies: "Hay fever",
        takes_medications: "yes",
        current_medications: "Oral antihistamines",
      },
    })

    expect(summary.title).toBe("Erectile dysfunction consult")
    expect(summary.patientStory).toContain("improve erections")
    expect(summary.patientStory).toContain("1 to 3 years")
    expect(summary.keyFacts).toContainEqual({ label: "IIEF-5 score", value: "12" })
    expect(summary.keyFacts).toContainEqual({ label: "Alpha blockers", value: "No" })
    expect(summary.recommendedPlan.action).toBe("prescribe")
    expect(summary.recommendedPlan.title).toMatch(/PDE5/i)
    expect(summary.prescriptionIntent?.presetLabel).toMatch(/ED/i)
    expect(summary.prescriptionIntent?.parchmentMode).toBe("open_patient_prescribe")
    expect(summary.draftNote).toMatch(/^S:\s/m)
    expect(summary.draftNote).toMatch(/^P:\s/m)
  })

  it("hard-blocks ED prescribing when current boolean nitrate screen is positive", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "ed",
      serviceType: "consult",
      patientName: "ED Patient",
      answers: {
        edGoal: "improve_erections",
        edDuration: "6_12_months",
        edAgeConfirmed: true,
        iiefTotal: 11,
        edNitrates: true,
        edRecentHeartEvent: false,
        edSevereHeart: false,
        edAlphaBlockers: false,
        edPreference: "prn",
      },
    })

    expect(summary.recommendedPlan.action).toBe("decline")
    expect(summary.prescriptionIntent).toBeUndefined()
    expect(summary.safetyItems).toContainEqual(
      expect.objectContaining({ severity: "block", label: "Nitrate use" }),
    )
  })

  it("keeps ED handoff context visible when caution history is GP-cleared", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "ed",
      serviceType: "consult",
      patientName: "ED Patient",
      answers: {
        edGoal: "improve_erections",
        edDuration: "6_12_months",
        edAgeConfirmed: true,
        iiefTotal: 11,
        edNitrates: false,
        edRecentHeartEvent: true,
        edSevereHeart: false,
        edAlphaBlockers: true,
        edGpCleared: true,
        edPreference: "prn",
      },
    })

    expect(summary.recommendedPlan.action).toBe("prescribe")
    expect(summary.prescriptionIntent).toMatchObject({
      medicationName: "Sildenafil",
      strength: "50mg",
    })
    expect(summary.prescriptionIntent?.cautionChecks).toEqual(
      expect.arrayContaining([
        "Recent cardiac event",
        "Alpha blocker use",
      ]),
    )
    expect(summary.safetyItems).toContainEqual(
      expect.objectContaining({ severity: "caution", label: "Recent cardiac event" }),
    )
    expect(summary.safetyItems).toContainEqual(
      expect.objectContaining({ severity: "caution", label: "Alpha blocker use" }),
    )
  })

  it("hard-blocks hair loss prescribing when reproductive contraindication is present", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "hair_loss",
      serviceType: "consult",
      patientName: "Alex Patient",
      answers: {
        hairGoal: "both",
        hairOnset: "1_2_years",
        hairPattern: "noticeable_thinning",
        hairFamilyHistory: "yes_father",
        hairMedicationPreference: "oral",
        hairReproductive: "yes",
        scalpNone: true,
        hairLowBP: false,
        hairHeartConditions: false,
        takes_medications: "no",
        has_allergies: "no",
        has_conditions: "no",
      },
    })

    expect(summary.title).toBe("Hair loss consult")
    expect(summary.recommendedPlan.action).toBe("decline")
    expect(summary.safetyItems).toContainEqual(
      expect.objectContaining({ severity: "block", label: "Reproductive contraindication" }),
    )
    expect(summary.prescriptionIntent).toBeUndefined()
  })

  it("turns safe oral hair loss requests into concise finasteride handoff context", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "hair_loss",
      serviceType: "consult",
      patientName: "Alex Patient",
      answers: {
        hairGoal: "both",
        hairOnset: "1_2_years",
        hairPattern: "noticeable_thinning",
        hairFamilyHistory: "yes_father",
        hairMedicationPreference: "oral",
        hairReproductive: "no",
        scalpNone: true,
        hairLowBP: false,
        hairHeartConditions: false,
        takes_medications: "no",
        has_allergies: "no",
        has_conditions: "no",
      },
    })

    expect(summary.recommendedPlan.action).toBe("prescribe")
    expect(summary.prescriptionIntent).toMatchObject({
      medicationName: "Finasteride",
      strength: "1mg",
      form: "tablet",
      quantityTemplate: "90 tablets",
    })
    expect(summary.prescriptionIntent?.directionsTemplate).toMatch(/once daily/i)
  })

  it("turns safe women's health UTI requests into Parchment prescribing context", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "womens_health",
      serviceType: "consult",
      patientName: "Siena Harding",
      answers: {
        womensHealthOption: "uti",
        utiSymptoms: ["burning", "frequency", "urgency", "cloudy"],
        utiRedFlags: "no",
        utiPregnant: "no",
        has_allergies: "no",
        takes_medications: "no",
      },
    })

    expect(summary.title).toBe("Women's health · UTI")
    expect(summary.recommendedPlan.action).toBe("prescribe")
    expect(summary.prescriptionIntent).toMatchObject({
      presetLabel: "UTI Parchment handoff context",
      parchmentMode: "open_patient_prescribe",
    })
    expect(summary.prescriptionIntent?.directionsTemplate).toMatch(/select first-line uncomplicated lower-UTI antibiotic/i)
  })

  it("keeps women's health UTI prescribing blocked when red flags are reported", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "womens_health",
      serviceType: "consult",
      patientName: "Siena Harding",
      answers: {
        womensHealthOption: "uti",
        utiSymptoms: ["burning"],
        utiRedFlags: "yes",
        utiPregnant: "no",
      },
    })

    expect(summary.recommendedPlan.action).toBe("request_info")
    expect(summary.prescriptionIntent).toBeUndefined()
    expect(summary.safetyItems).toContainEqual(
      expect.objectContaining({ severity: "block", label: "Red flags" }),
    )
  })

  it("turns safe women's health pill requests into Parchment prescribing context", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "womens_health",
      serviceType: "consult",
      patientName: "Siena Harding",
      answers: {
        womensHealthOption: "ocp_new",
        contraceptionType: "start",
        pregnancyStatus: "no",
        womens_migraine_aura: "no",
        womens_blood_clot_history: "no",
        womens_smoker: "no",
      },
    })

    expect(summary.title).toBe("Women's health · New pill")
    expect(summary.recommendedPlan.action).toBe("prescribe")
    expect(summary.prescriptionIntent).toMatchObject({
      presetLabel: "Contraceptive pill Parchment context",
      medicationSearchHint: "contraceptive pill",
    })
  })

  it("uses the requested medication as the repeat-prescription Parchment intent", () => {
    const summary = buildClinicalCaseSummary({
      category: "prescription",
      serviceType: "common_scripts",
      patientName: "Pat Script",
      answers: {
        medicationName: "Rosuvastatin",
        medicationStrength: "10 mg",
        medicationForm: "tablet",
        prescriptionHistory: "last_3_months",
        currentDose: "10 mg nightly",
        takes_medications: "no",
        has_allergies: "no",
        has_conditions: "no",
      },
    })

    expect(summary.title).toBe("Repeat prescription")
    expect(summary.patientStory).toContain("Rosuvastatin")
    expect(summary.keyFacts).toContainEqual({ label: "Patient-reported dose", value: "10 mg nightly" })
    expect(summary.recommendedPlan.action).toBe("prescribe")
    expect(summary.prescriptionIntent).toMatchObject({
      medicationName: "Rosuvastatin",
      strength: "10 mg",
      form: "tablet",
      parchmentMode: "open_patient_prescribe",
    })
    expect(summary.prescriptionIntent?.directionsTemplate).toContain("10 mg nightly")
  })

  it("surfaces unified repeat-prescription safety answers in the doctor summary", () => {
    const summary = buildClinicalCaseSummary({
      category: "prescription",
      serviceType: "repeat-script",
      patientName: "Pat Script",
      answers: {
        medicationName: "Rosuvastatin",
        medicationStrength: "10 mg",
        medicationForm: "tablet",
        prescriptionHistory: "last_3_months",
        currentDose: "10 mg nightly",
        hasAllergies: true,
        allergies: "Penicillin rash",
        hasConditions: true,
        conditions: "High cholesterol",
        hasOtherMedications: true,
        otherMedications: "Vitamin D daily",
        isPregnantOrBreastfeeding: false,
        hasAdverseMedicationReactions: true,
      },
    })

    expect(summary.keyFacts).toContainEqual({ label: "Allergies", value: "Penicillin rash" })
    expect(summary.keyFacts).toContainEqual({ label: "Conditions", value: "High cholesterol" })
    expect(summary.keyFacts).toContainEqual({ label: "Current medications", value: "Vitamin D daily" })
    expect(summary.keyFacts).toContainEqual({ label: "Pregnant/breastfeeding", value: "No" })
    expect(summary.keyFacts).toContainEqual({ label: "Adverse medication reactions", value: "Yes" })
    expect(summary.draftNote).toContain("Penicillin rash")
    expect(summary.draftNote).toContain("Vitamin D daily")
  })

  it("surfaces every requested repeat medication in the doctor summary", () => {
    const summary = buildClinicalCaseSummary({
      category: "prescription",
      serviceType: "repeat-script",
      patientName: "Pat Script",
      answers: {
        medicationName: "Rosuvastatin",
        medicationStrength: "10 mg",
        medicationForm: "tablet",
        prescriptionHistory: "last_3_months",
        currentDose: "10 mg nightly",
        medications: [
          { name: "Rosuvastatin", strength: "10 mg", form: "tablet", pbsCode: "MANUAL" },
          { name: "Metformin", strength: "500 mg", form: "tablet", pbsCode: "MANUAL" },
        ],
        hasAllergies: false,
        hasConditions: false,
        hasOtherMedications: false,
        isPregnantOrBreastfeeding: false,
        hasAdverseMedicationReactions: false,
      },
    })

    expect(summary.keyFacts).toContainEqual({
      label: "Requested medications",
      value: "Rosuvastatin 10 mg tablet; Metformin 500 mg tablet",
    })
    expect(summary.draftNote).toContain("Metformin 500 mg tablet")
    expect(summary.prescriptionIntent?.clipboardText).toContain("Metformin 500 mg tablet")
    expect(summary.prescriptionIntent?.quantityTemplate).toBeUndefined()
    expect(summary.prescriptionIntent?.repeatsTemplate).toBeUndefined()
    expect(summary.prescriptionIntent?.clipboardText).not.toContain("Quantity:")
    expect(summary.prescriptionIntent?.clipboardText).not.toContain("Repeats:")
  })

  it("does not duplicate medical certificate wording in the patient story", () => {
    const summary = buildClinicalCaseSummary({
      category: "med_cert",
      serviceType: "med_certs",
      patientName: "Pat Certificate",
      answers: {
        certType: "medical certificate",
        duration: "2",
        startDate: "2026-05-25",
        symptomDetails: "Fever and sore throat",
      },
    })

    expect(summary.patientStory).toContain("Requesting 2-day medical certificate.")
    expect(summary.patientStory).not.toContain("medical medical")
    expect(summary.patientStory).not.toContain("certificate certificate")
    expect(summary.recommendedPlan.title).toBe("Confirm certificate rules are met")
  })

  it("renders medical certificate patient story in professional sentence casing", () => {
    const summary = buildClinicalCaseSummary({
      category: "med_cert",
      serviceType: "med_certs",
      patientDateOfBirth: "1990-06-20",
      answers: {
        certType: "work",
        duration: "1",
        startDate: "2026-05-27",
        symptomDuration: "today",
        symptomDetails: "sore throat and fatigue since this morning. mild headache.",
      },
    })

    expect(summary.patientStory).toContain("35-year-old patient.")
    expect(summary.patientStory).toContain("Sore throat and fatigue since this morning. Mild headache.")
    expect(summary.patientStory).not.toContain("35yo patient. sore throat")
    expect(summary.draftNote).toContain("S: 35-year-old patient.")
    expect(summary.draftNote).toContain("O: Telehealth consultation. No physical examination.")
    expect(summary.draftNote).not.toContain("35yo patient")
    expect(summary.draftNote).not.toContain("Telehealth review; no physical examination performed.")
  })

  it("condenses verbose AMT repeat-script medicine strings for operator scanning", () => {
    const summary = buildClinicalCaseSummary({
      category: "prescription",
      serviceType: "repeat-script",
      patientName: "Pat Script",
      answers: {
        medications: [
          {
            name: "Metformin Tablet (extended release) containing metformin hydrochloride 1 g",
            strength: "Tablet (extended release) containing metformin hydrochloride 1 g",
            form: "Tablet (extended release) containing metformin hydrochloride 1 g",
            pbsCode: "13847T",
          },
        ],
        prescriptionHistory: "over_12_months",
        currentDose: "1 tablet daily",
        hasAllergies: false,
        hasConditions: false,
        hasOtherMedications: false,
        isPregnantOrBreastfeeding: false,
        hasAdverseMedicationReactions: false,
      },
    })

    expect(summary.keyFacts).toContainEqual({
      label: "Requested medication",
      value: "Metformin 1 g Tablet (extended release)",
    })
    expect(summary.patientStory).toContain("Metformin 1 g Tablet (extended release)")
    expect(summary.prescriptionIntent?.clipboardText).toContain("Metformin 1 g Tablet (extended release)")
  })

  it("builds a medical certificate summary without falling back to general consult copy", () => {
    const summary = buildClinicalCaseSummary({
      serviceType: "med_certs",
      patientName: "Cert Patient",
      answers: {
        certType: "work",
        duration: "2",
        startDate: "2026-04-29",
        symptoms: ["Sore throat", "Fatigue"],
        symptomDuration: "two_days",
        symptomDetails: "I have been unwell with viral symptoms and cannot attend work.",
      },
    })

    expect(summary.title).toBe("Medical certificate request")
    expect(summary.patientStory).toContain("viral symptoms")
    expect(summary.keyFacts).toContainEqual({ label: "Requested duration", value: "2 days" })
    expect(summary.recommendedPlan.action).toBe("approve")
    expect(summary.prescriptionIntent).toBeUndefined()
  })

  it("requests more detail instead of approving blank-symptom medical certificates", () => {
    const summary = buildClinicalCaseSummary({
      serviceType: "med_certs",
      patientName: "Cert Patient",
      answers: {
        certType: "work",
        duration: "2",
        startDate: "2026-05-25",
      },
    })

    expect(summary.recommendedPlan.action).toBe("request_info")
    expect(summary.recommendedPlan.title).toBe("Request symptom detail")
    expect(summary.keyFacts).not.toContainEqual({ label: "Patient note", value: "None provided" })
    expect(summary.draftNote).toContain("Request symptom detail before issuing a certificate.")
  })

  it("falls back to a minimal 'manual review' summary for legacy or unknown consult subtypes", () => {
    // After the 2026-05-20 general consult retirement, the case summary helper
    // no longer has a dedicated path for `subtype = 'general'`. The fallback
    // surface still renders so doctors can view legacy intakes (3 historical
    // rows in production) — just with a request_info recommendation instead of
    // a bespoke plan.
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "general",
      serviceType: "consult",
      patientName: "Legacy Patient",
      answers: {
        consultDetails: "I have ongoing reflux symptoms and would like advice on the safest next step.",
      },
    })

    expect(summary.title).toBe("Consult · General")
    expect(summary.patientStory).toContain("reflux symptoms")
    expect(summary.recommendedPlan.action).toBe("request_info")
    expect(summary.prescriptionIntent).toBeUndefined()
  })

  describe("ED handoff context wiring (2026-05-26)", () => {
    it("daily preference fills prescriptionIntent with Tadalafil 5mg", () => {
      const summary = buildClinicalCaseSummary({
        category: "consult",
        subtype: "ed",
        serviceType: "consult",
        patientName: "Test Patient",
        answers: {
          edGoal: "improve_erections",
          edDuration: "1_to_3_years",
          edPreference: "daily",
          iiefTotal: 12,
          edNitrates: "no",
          edRecentHeartEvent: "no",
          edSevereHeart: "no",
          edAlphaBlockers: "no",
        },
      })
      expect(summary.prescriptionIntent?.medicationName).toBe("Tadalafil")
      expect(summary.prescriptionIntent?.strength).toBe("5mg")
      expect(summary.prescriptionIntent?.quantityTemplate).toBe("30 tablets")
      expect(summary.prescriptionIntent?.directionsTemplate).toMatch(/once daily/i)
      expect(summary.prescriptionIntent?.clipboardText).toContain("Tadalafil")
      expect(summary.prescriptionIntent?.clipboardText).not.toContain("30 tablets")
    })

    it("prn preference fills prescriptionIntent with Sildenafil 50mg", () => {
      const summary = buildClinicalCaseSummary({
        category: "consult",
        subtype: "ed",
        serviceType: "consult",
        patientName: "Test Patient",
        answers: {
          edGoal: "improve_erections",
          edDuration: "1_to_3_years",
          edPreference: "prn",
          edNitrates: "no",
          edRecentHeartEvent: "no",
          edSevereHeart: "no",
          edAlphaBlockers: "no",
        },
      })
      expect(summary.prescriptionIntent?.medicationName).toBe("Sildenafil")
      expect(summary.prescriptionIntent?.strength).toBe("50mg")
      expect(summary.prescriptionIntent?.directionsTemplate).toMatch(/1 hour before/i)
    })

    it("doctor_decides preference defaults to Sildenafil 50mg with alternative note", () => {
      const summary = buildClinicalCaseSummary({
        category: "consult",
        subtype: "ed",
        serviceType: "consult",
        patientName: "Test Patient",
        answers: {
          edGoal: "improve_erections",
          edDuration: "1_to_3_years",
          edPreference: "doctor_decides",
          edNitrates: "no",
          edRecentHeartEvent: "no",
          edSevereHeart: "no",
          edAlphaBlockers: "no",
        },
      })
      expect(summary.prescriptionIntent?.medicationName).toBe("Sildenafil")
      expect((summary.prescriptionIntent as { alternativeNote?: string })?.alternativeNote).toMatch(/Tadalafil 5mg/i)
    })

    it("hard contraindication still suppresses prescriptionIntent", () => {
      const summary = buildClinicalCaseSummary({
        category: "consult",
        subtype: "ed",
        serviceType: "consult",
        patientName: "Test Patient",
        answers: {
          edGoal: "improve_erections",
          edPreference: "daily",
          edNitrates: "yes",
        },
      })
      expect(summary.prescriptionIntent).toBeUndefined()
    })
  })

  describe("doctor-voice note rewrite (2026-05-26)", () => {
    it("med cert: writes a SOAP note with age + sex shorthand and normalised symptoms", () => {
      const summary = buildClinicalCaseSummary({
        category: "medical_certificate",
        serviceType: "med_certs",
        patientName: "Tuki Tkt",
        patientDateOfBirth: "2000-11-14",
        patientSex: "female",
        answers: {
          certType: "work",
          duration: "2",
          startDate: "2026-05-25",
          symptomDetails: "fever nose full get cold",
          symptomDuration: "1-2 days",
        },
      })

      // Should NOT contain the old AI-generated phrasing
      expect(summary.draftNote).not.toContain("requests a work")
      expect(summary.draftNote).not.toContain("Medical certificate request requires doctor review")
      expect(summary.draftNote).not.toContain("Confirm symptoms and requested dates")

      // SHOULD contain SOAP shorthand
      expect(summary.draftNote).toMatch(/^S:\s/m)
      expect(summary.draftNote).toMatch(/^O:\s/m)
      expect(summary.draftNote).toMatch(/^A:\s/m)
      expect(summary.draftNote).toMatch(/^P:\s/m)
      expect(summary.draftNote).not.toContain("Reviewed patient-submitted intake")
      expect(summary.draftNote).not.toContain("No red flags noted")

      // Age + sex render in signed-record language on the S line.
      expect(summary.draftNote).toMatch(/^S:\s+25-year-old F/m)
      expect(summary.draftNote).not.toContain("25yo F")

      // Normalised symptoms (not the raw patient text)
      expect(summary.draftNote).toContain("Fever, nasal congestion, cold symptoms")
      expect(summary.draftNote).not.toContain("fever nose full get cold")

      // Plan should mention the date range and safety-netting language
      expect(summary.draftNote).toMatch(/2-day medical certificate/)
      expect(summary.draftNote).toMatch(/Return if/i)
    })

    it("sentence-cases generated SOAP note fragments before rendering", () => {
      const summary = buildClinicalCaseSummary({
        category: "medical_certificate",
        serviceType: "med_certs",
        patientName: "Mia Carter",
        patientDateOfBirth: "1990-06-20",
        answers: {
          certType: "work",
          duration: "1",
          startDate: "2026-05-27",
          symptomDetails: "sore throat and fatigue since this morning. mild headache. no chest pain.",
          symptomDuration: "today",
        },
      })

      expect(summary.draftNote).toContain("Mild headache.")
      expect(summary.draftNote).toContain("No chest pain.")
      expect(summary.draftNote).not.toContain(". mild headache")
      expect(summary.draftNote).not.toContain(". no chest pain")
    })

    it("ED consult: doctor-voice note with IIEF + screen reference", () => {
      const summary = buildClinicalCaseSummary({
        category: "consult",
        subtype: "ed",
        serviceType: "consult",
        patientName: "Stacy Walker",
        patientDateOfBirth: "1986-01-06",
        patientSex: "male",
        answers: {
          edGoal: "improve_erections",
          edDuration: "1_to_3_years",
          edPreference: "daily",
          iiefTotal: 10,
          edNitrates: "no",
          edRecentHeartEvent: "no",
          edSevereHeart: "no",
          edAlphaBlockers: "no",
        },
      })

      expect(summary.draftNote).not.toContain("Potentially suitable for ED prescribing subject to doctor review")
      expect(summary.draftNote).not.toContain("Confirm current medicines and cardiovascular risk")

      expect(summary.draftNote).toMatch(/^S:\s+40-year-old M/m)
      expect(summary.draftNote).toMatch(/IIEF-5\s+10\/25/i)
      expect(summary.draftNote).toMatch(/^P:\s/m)
    })

    it("falls back to a generic age string when DOB is missing", () => {
      const summary = buildClinicalCaseSummary({
        category: "medical_certificate",
        serviceType: "med_certs",
        patientName: "John Doe",
        patientDateOfBirth: null,
        patientSex: null,
        answers: { certType: "work", duration: "1", startDate: "2026-05-26", symptomDetails: "headache" },
      })

      // No "NaNyo" or undefined leakage
      expect(summary.draftNote).not.toMatch(/NaN/)
      expect(summary.draftNote).not.toMatch(/undefined/)
      expect(summary.draftNote).not.toMatch(/null/)

      // Should still produce a coherent note with S/O/A/P
      expect(summary.draftNote).toMatch(/^S:\s/m)
      expect(summary.draftNote).toMatch(/^P:\s/m)
    })

    it("repeat prescription: doctor-voice with medication-specific plan", () => {
      const summary = buildClinicalCaseSummary({
        category: "prescription",
        serviceType: "repeat_rx",
        patientName: "Jane Roe",
        patientDateOfBirth: "1985-03-15",
        patientSex: "female",
        answers: {
          medicationName: "Sertraline",
          medicationStrength: "50mg",
          currentDose: "1 daily",
          prescriptionHistory: "stable on dose for 2 years",
        },
      })

      expect(summary.draftNote).not.toContain("Repeat existing regimen after doctor confirms")
      expect(summary.draftNote).toMatch(/^S:\s+\d+-year-old F/m)
      expect(summary.draftNote).toContain("Sertraline")
      expect(summary.draftNote).toMatch(/^P:\s/m)
    })
  })
})
