import { describe, expect, it } from "vitest"

import {
  buildPillTerminalBlockCorrection,
  buildUtiTerminalBlockCorrection,
  deriveEdNitrateTerminalBlock,
  derivePillTerminalBlock,
  deriveRepeatMedicationTerminalBlock,
  deriveUtiTerminalBlock,
} from "@/lib/request/terminal-safety-blocks"

describe("request terminal safety blocks", () => {
  describe("ED nitrate block", () => {
    it("derives the existing terminal explanation from a persisted nitrate answer", () => {
      expect(deriveEdNitrateTerminalBlock({ edNitrates: true })).toEqual({
        kind: "ed_nitrates",
        title: "This service is not suitable for you",
        reason: "Some ED prescription options can cause a dangerous drop in blood pressure when combined with nitrates. Please see your GP or cardiologist.",
      })
    })

    it.each([
      {},
      { edNitrates: false },
    ])("leaves the editable form visible for a non-blocking answer: %o", (answers) => {
      expect(deriveEdNitrateTerminalBlock(answers)).toBeNull()
    })
  })

  describe("women's-health UTI block", () => {
    it("derives the urgent red-flag block from persisted answers", () => {
      expect(deriveUtiTerminalBlock({ utiRedFlags: "yes", utiPregnant: "no" })).toEqual({
        kind: "uti_red_flags",
        title: "Please seek urgent care",
        reason: "Symptoms like fever, back/flank pain, or feeling very unwell may indicate a kidney infection which requires urgent in-person medical care. Please see a GP or visit urgent care today.",
        answerKeysToClear: ["utiRedFlags"],
      })
    })

    it.each(["yes", "not_sure"])(
      "derives the in-person pregnancy block for %s",
      (utiPregnant) => {
        expect(deriveUtiTerminalBlock({ utiRedFlags: "no", utiPregnant })).toEqual({
          kind: "uti_pregnancy",
          title: "Please seek urgent care",
          reason: "UTIs during pregnancy need in-person assessment. Please see your GP or visit a clinic for safe treatment.",
          answerKeysToClear: ["utiPregnant"],
        })
      },
    )

    it("uses red-flag-first presentation and clears every active trigger when both apply", () => {
      const answers = { utiRedFlags: "yes", utiPregnant: "not_sure" }
      const block = deriveUtiTerminalBlock(answers)

      expect(block).toMatchObject({
        kind: "uti_red_flags",
        answerKeysToClear: ["utiRedFlags", "utiPregnant"],
      })

      const correctedAnswers = {
        ...answers,
        ...buildUtiTerminalBlockCorrection(block!),
      }

      expect(correctedAnswers).toEqual({
        utiRedFlags: undefined,
        utiPregnant: undefined,
      })
      expect(deriveUtiTerminalBlock(correctedAnswers)).toBeNull()
    })

    it.each([
      {},
      { utiRedFlags: "no", utiPregnant: "no" },
    ])("leaves the editable form visible for non-blocking answers: %o", (answers) => {
      expect(deriveUtiTerminalBlock(answers)).toBeNull()
    })
  })

  describe("new-pill terminal redirects", () => {
    it("derives an in-person block from a persisted confirmed-pregnancy answer", () => {
      expect(derivePillTerminalBlock({
        consultSubtype: "womens_health",
        womensHealthOption: "ocp_new",
        pregnancyStatus: "yes",
      })).toEqual({
        kind: "pill_pregnancy",
        title: "This service is not suitable during pregnancy",
        reason: "The contraceptive pill is not started during pregnancy. Please speak with your GP or obstetrician about the right care for you.",
        answerKeysToClear: ["pregnancyStatus"],
      })
    })

    it.each([
      {
        label: "possible pregnancy",
        answer: { pregnancyStatus: "not_sure" },
        answerKey: "pregnancyStatus",
        reason: "Pregnancy needs to be ruled out before starting or switching the pill. Please take a pregnancy test or speak with a GP or sexual health clinic.",
      },
      {
        label: "migraine with aura",
        answer: { pregnancyStatus: "no", womens_migraine_aura: "yes" },
        answerKey: "womens_migraine_aura",
        reason: "Some contraceptive pills may be unsafe if you have migraines with aura. Please speak with a GP or sexual health clinic.",
      },
      {
        label: "blood-clot history",
        answer: { pregnancyStatus: "no", womens_blood_clot_history: "yes" },
        answerKey: "womens_blood_clot_history",
        reason: "Some contraceptive pills may be unsafe if you or a close family member have had a blood clot. Please speak with a GP or sexual health clinic.",
      },
      {
        label: "smoking",
        answer: { pregnancyStatus: "no", womens_smoker: "yes" },
        answerKey: "womens_smoker",
        reason: "Smoking changes which contraceptive pills may be safe, especially from age 35. Please speak with a GP or sexual health clinic.",
      },
    ])("derives a truthful pre-payment redirect for $label", ({ answer, answerKey, reason }) => {
      expect(derivePillTerminalBlock({
        consultSubtype: "womens_health",
        womensHealthOption: "ocp_new",
        womens_migraine_aura: "no",
        womens_blood_clot_history: "no",
        womens_smoker: "no",
        ...answer,
      })).toEqual({
        kind: "pill_redirect",
        title: "This paid pathway cannot continue",
        reason,
        answerKeysToClear: [answerKey],
      })
    })

    it("explains and clears every active pre-payment redirect trigger", () => {
      const answers = {
        consultSubtype: "womens_health",
        womensHealthOption: "ocp_new",
        pregnancyStatus: "not_sure",
        requiresCall: true,
        womens_migraine_aura: "yes",
        womens_blood_clot_history: "yes",
        womens_smoker: "yes",
        lastPeriod: "2 weeks ago",
      }
      const block = derivePillTerminalBlock(answers)

      expect(block).toMatchObject({
        kind: "pill_redirect",
        title: "This paid pathway cannot continue",
        answerKeysToClear: [
          "pregnancyStatus",
          "womens_migraine_aura",
          "womens_blood_clot_history",
          "womens_smoker",
        ],
      })
      expect(block?.reason).toContain("Pregnancy needs to be ruled out")
      expect(block?.reason).toContain("migraines with aura")
      expect(block?.reason).toContain("blood clot")
      expect(block?.reason).toContain("Smoking changes")

      const correctedAnswers = {
        ...answers,
        ...buildPillTerminalBlockCorrection(block!),
      }

      expect(correctedAnswers).toEqual({
        consultSubtype: "womens_health",
        womensHealthOption: "ocp_new",
        pregnancyStatus: undefined,
        requiresCall: undefined,
        womens_migraine_aura: undefined,
        womens_blood_clot_history: undefined,
        womens_smoker: undefined,
        lastPeriod: "2 weeks ago",
      })
      expect(derivePillTerminalBlock(correctedAnswers)).toBeNull()
    })

    it("keeps confirmed pregnancy copy as the priority while correction clears every active key", () => {
      const answers = {
        consultSubtype: "womens_health",
        womensHealthOption: "ocp_new",
        pregnancyStatus: "yes",
        requiresCall: true,
        womens_migraine_aura: "yes",
        womens_blood_clot_history: "yes",
        womens_smoker: "yes",
      }
      const block = derivePillTerminalBlock(answers)

      expect(block).toEqual({
        kind: "pill_pregnancy",
        title: "This service is not suitable during pregnancy",
        reason: "The contraceptive pill is not started during pregnancy. Please speak with your GP or obstetrician about the right care for you.",
        answerKeysToClear: [
          "pregnancyStatus",
          "womens_migraine_aura",
          "womens_blood_clot_history",
          "womens_smoker",
        ],
      })

      expect({ ...answers, ...buildPillTerminalBlockCorrection(block!) }).toMatchObject({
        pregnancyStatus: undefined,
        requiresCall: undefined,
        womens_migraine_aura: undefined,
        womens_blood_clot_history: undefined,
        womens_smoker: undefined,
      })
    })

    it.each([
      {},
      {
        consultSubtype: "womens_health",
        womensHealthOption: "uti",
        pregnancyStatus: "yes",
      },
      {
        consultSubtype: "ed",
        womensHealthOption: "ocp_new",
        pregnancyStatus: "yes",
        womens_migraine_aura: "yes",
      },
      {
        consultSubtype: "womens_health",
        pregnancyStatus: "yes",
      },
      { pregnancyStatus: "no" },
      {
        consultSubtype: "womens_health",
        womensHealthOption: "ocp_new",
        pregnancyStatus: "no",
        womens_migraine_aura: "no",
        womens_blood_clot_history: "no",
        womens_smoker: "no",
      },
    ])("leaves clean or out-of-scope answers editable: %o", (answers) => {
      expect(derivePillTerminalBlock(answers)).toBeNull()
    })
  })

  describe("repeat-medication controlled-substance block", () => {
    it("derives the controlled block from a restored medications array", () => {
      expect(deriveRepeatMedicationTerminalBlock({
        medications: [{ name: "Oxycodone", strength: "5 mg" }],
      })).toMatchObject({
        kind: "repeat_controlled_medication",
        medicationName: "Oxycodone",
        title: "This medication cannot be prescribed online",
      })
    })

    it("derives the controlled block from a restored legacy medication product", () => {
      expect(deriveRepeatMedicationTerminalBlock({
        selectedMedication: { drug_name: "Diazepam", strength: "5 mg" },
      })).toMatchObject({
        kind: "repeat_controlled_medication",
        medicationName: "Diazepam",
      })
    })

    it("finds a controlled medicine in a legacy multi-row draft", () => {
      expect(deriveRepeatMedicationTerminalBlock({
        medications: [
          { name: "Atorvastatin", strength: "20 mg" },
          { name: "Oxycodone", strength: "5 mg" },
        ],
      })).toMatchObject({
        kind: "repeat_controlled_medication",
        medicationName: "Oxycodone",
      })
    })

    it.each([
      {},
      { medications: [{ name: "Atorvastatin" }] },
      { medicationName: "Metformin" },
    ])("does not block a safe or unanswered repeat request: %o", (answers) => {
      expect(deriveRepeatMedicationTerminalBlock(answers)).toBeNull()
    })
  })
})
