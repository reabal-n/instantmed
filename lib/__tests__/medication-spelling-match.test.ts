import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ generate: vi.fn() }))
vi.mock("ai", () => ({ generateText: mocks.generate }))
vi.mock("@/lib/ai/provider", () => ({
  getModelWithConfig: () => ({ model: "synthetic-model" }),
}))

import { ADDITIONAL_MEDICATION_NAME_REFERENCES } from "@/lib/clinical/generic-medication-resolver"
import { resolveMedicationSpelling } from "@/lib/clinical/medication-spelling-match"

const rows = [
  { name: "Sertraline", brand_names: ["Zoloft"] },
  { name: "Metformin", brand_names: ["Diabex"] },
  { name: "Prednisone", brand_names: [] },
  { name: "Prednisolone", brand_names: [] },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-key")
  mocks.generate.mockResolvedValue({ text: '{"sameMedication":true}' })
})

afterEach(() => vi.unstubAllEnvs())

describe("catalogue-backed AI spelling check", () => {
  it("returns only the catalogue generic name for a confirmed narrow typo", async () => {
    expect(await resolveMedicationSpelling("Sertralne 100 mg tablet", rows)).toBe("Sertraline")
    const request = mocks.generate.mock.calls[0][0]
    expect(request.prompt).toContain("sertralne")
    expect(request.prompt).not.toMatch(/100|tablet|patient_id/)
    expect(request.maxRetries).toBe(0)
  })

  it("recognises a brand typo while copying the catalogue generic", async () => {
    expect(await resolveMedicationSpelling("Zoloff", rows)).toBe("Sertraline")
  })

  it("supports the TGA-referenced weight-management names", async () => {
    expect(await resolveMedicationSpelling("Wegovi", ADDITIONAL_MEDICATION_NAME_REFERENCES)).toBe("Semaglutide")
    expect(await resolveMedicationSpelling("Mounjarro", ADDITIONAL_MEDICATION_NAME_REFERENCES)).toBe("Tirzepatide")
  })

  it("does not let AI choose between similarly spelled catalogue entries", async () => {
    expect(await resolveMedicationSpelling("Sertralne", [...rows, { name: "Sertralene", brand_names: [] }])).toBeNull()
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it.each(["something unrelated", "prednisone", "My name is Jane and I take Sertralne", "x"])(
    "does not ask AI to guess from ambiguous or unrelated input: %s", async value => {
      expect(await resolveMedicationSpelling(value, rows)).toBeNull()
      expect(mocks.generate).not.toHaveBeenCalled()
    },
  )

  it.each(['{"sameMedication":false}', '{"sameMedication":true,"name":"Invented drug"}', 'Sertraline', '{}'])(
    "rejects unconfirmed or malformed AI output: %s", async text => {
      mocks.generate.mockResolvedValue({ text })
      expect(await resolveMedicationSpelling("Sertralne", rows)).toBeNull()
    },
  )

  it("groups competing brand spellings under the same generic identity", async () => {
    expect(await resolveMedicationSpelling("Effxor", [
      { name: "Venlafaxine", brand_names: ["Efexor", "Effexor"] },
    ])).toBe("Venlafaxine")
    expect(mocks.generate).toHaveBeenCalledOnce()
  })

  it("does not send a gateway-only credential to the direct provider", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "")
    vi.stubEnv("VERCEL_AI_GATEWAY_API_KEY", "synthetic-gateway-key")
    expect(await resolveMedicationSpelling("Sertralne", rows)).toBeNull()
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it("keeps residual directions out of the provider prompt", async () => {
    expect(await resolveMedicationSpelling("hydrochlorothiazide qd", [
      { name: "Hydrochlorothiazide", brand_names: [] },
    ])).toBeNull()
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it("fails closed on provider errors and unavailable configuration", async () => {
    mocks.generate.mockRejectedValue(new Error("private provider detail"))
    expect(await resolveMedicationSpelling("Sertralne", rows)).toBeNull()
    mocks.generate.mockClear()
    vi.stubEnv("ANTHROPIC_API_KEY", "")
    expect(await resolveMedicationSpelling("Sertralne", rows)).toBeNull()
    expect(mocks.generate).not.toHaveBeenCalled()
  })
})
