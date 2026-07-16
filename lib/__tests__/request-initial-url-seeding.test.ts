import { describe, expect, it } from "vitest"

import { getInitialRequestUrlDecision } from "@/lib/request/initial-url-seeding"

describe("getInitialRequestUrlDecision", () => {
  it("seeds the consult subtype from the initial URL", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "consult",
        initialSubtype: "ed",
      }),
    ).toEqual({
      answerSeeds: [{ key: "consultSubtype", value: "ed" }],
    })
  })

  it.each([
    ["uti", "uti"],
    ["ocp_new", "ocp_new"],
  ])("preselects the validated women's-health %s intent", (initialIntent, expectedOption) => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "consult",
        initialSubtype: "womens_health",
        initialIntent,
      }),
    ).toEqual({
      answerSeeds: [
        { key: "consultSubtype", value: "womens_health" },
        { key: "womensHealthOption", value: expectedOption },
      ],
    })
  })

  it.each([undefined, "", "ocp_repeat", "UTI", "pill"])(
    "keeps generic or invalid women's-health intent %s neutral",
    (initialIntent) => {
      expect(
        getInitialRequestUrlDecision({
          initialService: "consult",
          initialSubtype: "womens_health",
          initialIntent,
        }),
      ).toEqual({
        answerSeeds: [{ key: "consultSubtype", value: "womens_health" }],
      })
    },
  )

  it("does not apply a women's-health intent to another consult subtype", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "consult",
        initialSubtype: "ed",
        initialIntent: "uti",
      }),
    ).toEqual({
      answerSeeds: [{ key: "consultSubtype", value: "ed" }],
    })
  })

  it("preserves an existing women's-health option instead of overwriting patient work", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "consult",
        initialSubtype: "womens_health",
        initialIntent: "uti",
        storedWomensHealthOption: "ocp_new",
      }),
    ).toEqual({
      answerSeeds: [{ key: "consultSubtype", value: "womens_health" }],
    })
  })

  it("reports a saved draft subtype mismatch without overwriting the draft subtype", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "consult",
        initialSubtype: "ed",
        storedConsultSubtype: "hair_loss",
        lastSavedAt: "2026-06-12T01:30:00.000Z",
      }),
    ).toEqual({
      answerSeeds: [],
      subtypeMismatch: { draftSubtype: "hair_loss" },
    })
  })

  it("does not leak a women's-health intent into a mismatched saved consult draft", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "consult",
        initialSubtype: "womens_health",
        initialIntent: "uti",
        storedConsultSubtype: "hair_loss",
        lastSavedAt: "2026-06-12T01:30:00.000Z",
      }),
    ).toEqual({
      answerSeeds: [],
      subtypeMismatch: { draftSubtype: "hair_loss" },
    })
  })

  it("keeps coming-soon consult subtypes on their redirect path", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "consult",
        initialSubtype: "weight_loss",
      }),
    ).toEqual({
      answerSeeds: [{ key: "consultSubtype", value: "weight_loss" }],
      redirectPath: "/weight-loss",
    })
  })

  it("seeds valid certificate type and duration URL params", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "med-cert",
        initialCertType: "study",
        initialDuration: "2",
      }),
    ).toEqual({
      answerSeeds: [
        { key: "certType", value: "study" },
        { key: "duration", value: "2" },
      ],
    })
  })

  it("does not override existing certificate type or duration answers", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "med-cert",
        initialCertType: "carer",
        initialDuration: "3",
        storedCertType: "work",
        storedDuration: "1",
      }),
    ).toEqual({
      answerSeeds: [],
    })
  })

  it("ignores invalid certificate type and duration URL params", () => {
    expect(
      getInitialRequestUrlDecision({
        initialService: "med-cert",
        initialCertType: "sick",
        initialDuration: "4",
      }),
    ).toEqual({
      answerSeeds: [],
    })
  })
})
