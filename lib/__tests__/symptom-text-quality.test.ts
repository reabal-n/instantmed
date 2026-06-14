import { describe, expect,it } from "vitest"

import { validateSymptomTextQuality } from "@/lib/clinical/symptom-text-quality"

describe("validateSymptomTextQuality", () => {
  describe("required + non-empty (no length / word-count gate)", () => {
    it("rejects empty / null / undefined", () => {
      expect(validateSymptomTextQuality("").valid).toBe(false)
      expect(validateSymptomTextQuality(null).valid).toBe(false)
      expect(validateSymptomTextQuality(undefined).valid).toBe(false)
    })

    it("accepts brief real input — no minimum length or word count (2026-05-29)", () => {
      // The char + word-count gates were removed; a single recognizable
      // symptom word is enough. The stem check below is the only floor.
      expect(validateSymptomTextQuality("migraine").valid).toBe(true)
      expect(validateSymptomTextQuality("fever").valid).toBe(true)
      expect(validateSymptomTextQuality("bad back today").valid).toBe(true)
    })

    it("rejects whitespace-padded text with no symptom word", () => {
      const result = validateSymptomTextQuality("   short text   ")
      expect(result.valid).toBe(false)
    })
  })

  describe("repetition / filler (rejected by the symptom-word check)", () => {
    it("rejects single repeated word", () => {
      const result = validateSymptomTextQuality("test test test test test test test")
      expect(result.valid).toBe(false)
    })

    it("rejects two-word repetition", () => {
      const result = validateSymptomTextQuality("hi there hi there hi there hi there")
      expect(result.valid).toBe(false)
    })
  })

  describe("vocabulary check (gibberish detection)", () => {
    it("rejects 'my doonis is vibration. statement.' (the original incident)", () => {
      const result = validateSymptomTextQuality("my doonis is vibration. statement.")
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/plain English/)
    })

    it("rejects 'my doonis is vibration'", () => {
      const result = validateSymptomTextQuality("my doonis is vibration something")
      expect(result.valid).toBe(false)
    })

    it("rejects keyboard mashing", () => {
      const result = validateSymptomTextQuality("asdfghjkl qwertyuiop zxcvbnm poiuyt")
      expect(result.valid).toBe(false)
    })

    it("rejects random nouns with no medical context", () => {
      const result = validateSymptomTextQuality("table chair window curtain garage roof")
      expect(result.valid).toBe(false)
    })
  })

  describe("valid descriptions", () => {
    it("accepts the test fixture used by auto-approval tests", () => {
      const result = validateSymptomTextQuality(
        "I have a cold and runny nose since yesterday",
      )
      expect(result.valid).toBe(true)
    })

    it("accepts a typical fever description", () => {
      const result = validateSymptomTextQuality(
        "I've had a fever since yesterday, severe body aches",
      )
      expect(result.valid).toBe(true)
    })

    it("accepts brief but real symptom text", () => {
      const result = validateSymptomTextQuality("really sick today, can't get out of bed")
      expect(result.valid).toBe(true)
    })

    it("accepts brief multi-word descriptions", () => {
      expect(validateSymptomTextQuality("fever and cough").valid).toBe(true)
      expect(validateSymptomTextQuality("bad cough today").valid).toBe(true)
    })

    it("accepts broken English from non-native speakers", () => {
      const result = validateSymptomTextQuality("very sick today, no energy, head hurt bad")
      expect(result.valid).toBe(true)
    })

    it("accepts stomach symptoms", () => {
      const result = validateSymptomTextQuality(
        "stomach has been cramping for two days, hard to eat",
      )
      expect(result.valid).toBe(true)
    })

    it("accepts back pain description", () => {
      const result = validateSymptomTextQuality("my back is killing me when I move around")
      expect(result.valid).toBe(true)
    })

    it("accepts mental health phrasing (caught downstream as soft-flag)", () => {
      const result = validateSymptomTextQuality("feeling anxious and exhausted, can't sleep at all")
      expect(result.valid).toBe(true)
    })

    it("accepts cough/respiratory description", () => {
      const result = validateSymptomTextQuality(
        "constant coughing and sore throat for 3 days",
      )
      expect(result.valid).toBe(true)
    })

    it("accepts migraine description", () => {
      const result = validateSymptomTextQuality(
        "severe migraine since this morning, light hurts my eyes",
      )
      expect(result.valid).toBe(true)
    })

    it("handles inflected forms via substring match", () => {
      // 'experiencing' matches 'experienc', 'headaches' matches 'headache',
      // 'feeling' matches 'feel'. Substring approach avoids needing a stemmer.
      const result = validateSymptomTextQuality(
        "experiencing severe headaches and feeling nauseous since morning",
      )
      expect(result.valid).toBe(true)
    })
  })

  describe("named conditions previously rejected by the stem gate", () => {
    // Each phrase is worded so ONLY the newly-added stem can satisfy the gate
    // (no other existing vocabulary word matches), proving the stem is what
    // unblocks it. These are real plain-language conditions patients type that
    // the gate silently rejected, adding friction to the symptoms step.
    const cases: Array<[string, string]> = [
      ["gout", "gout"],
      ["i think i have a uti", "uti"],
      ["tested positive for covid", "covid"],
      ["shingles", "shingles"],
      ["acid reflux", "reflux"],
      ["tonsillitis", "tonsillitis"],
      ["psoriasis", "psoriasis"],
      ["eczema", "eczema"],
      ["sciatica", "sciatica"],
      ["gastro", "gastro"],
      ["hernia", "hernia"],
      ["abscess", "abscess"],
      ["i strained it badly", "strain"],
      ["sprain", "sprain"],
    ]
    it.each(cases)("accepts %j (via stem %j)", (text) => {
      expect(validateSymptomTextQuality(text).valid).toBe(true)
    })

    it("matches 'uti' as a discrete token, not a substring", () => {
      // "routine" and "beautiful" both contain the substring "uti"; a substring
      // match would wrongly pass them through the only gate. (Avoid words like
      // "day"/"work" here — those are legitimate stems.)
      expect(validateSymptomTextQuality("routine").valid).toBe(false)
      expect(validateSymptomTextQuality("beautiful").valid).toBe(false)
    })

    it("does NOT accept blood-in-urine as a sole symptom (haematuria → doctor)", () => {
      // Deliberately excluded: haematuria as a lone complaint should not pass
      // the gate as a routine sick-day symptom.
      expect(validateSymptomTextQuality("blood in urine").valid).toBe(false)
      expect(validateSymptomTextQuality("blood in my urine").valid).toBe(false)
    })

    it("still rejects gibberish after the additions", () => {
      expect(validateSymptomTextQuality("table chair window curtain garage roof").valid).toBe(false)
      expect(validateSymptomTextQuality("asdfghjkl qwertyuiop zxcvbnm poiuyt").valid).toBe(false)
    })
  })

  describe("edge cases", () => {
    it("handles punctuation-heavy input", () => {
      const result = validateSymptomTextQuality(
        "fever!!! and headache??? since yesterday...",
      )
      expect(result.valid).toBe(true)
    })

    it("ignores case", () => {
      const result = validateSymptomTextQuality("FEVER AND HEADACHE SINCE YESTERDAY")
      expect(result.valid).toBe(true)
    })

    it("rejects gibberish even when long", () => {
      const result = validateSymptomTextQuality(
        "qwerty asdfgh zxcvbn poiuyt lkjhgf mnbvcx zxcvbn",
      )
      expect(result.valid).toBe(false)
    })
  })
})
