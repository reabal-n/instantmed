import { describe, expect, it } from "vitest"

import {
  buildUtiTerminalBlockCorrection,
  deriveEdNitrateTerminalBlock,
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
