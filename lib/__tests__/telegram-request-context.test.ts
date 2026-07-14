import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  readAnswers: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/security/phi-field-wrappers", () => ({
  readAnswers: mocks.readAnswers,
}))

describe("Telegram request context", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads only the encrypted answer columns and delegates decryption", async () => {
    const encrypted = { ciphertext: "encrypted" }
    const maybeSingle = vi.fn(async () => ({
      data: { answers: { fallback: true }, answers_encrypted: encrypted },
      error: null,
    }))
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({ select })),
    })
    mocks.readAnswers.mockResolvedValue({
      medications: [{ name: "Atorvastatin", strength: "20 mg", form: "tablet" }],
    })

    const context = await import("@/lib/notifications/request-context")
    const answers = await context.loadTelegramRequestAnswers("intake-1")

    expect(select).toHaveBeenCalledWith("answers, answers_encrypted")
    expect(eq).toHaveBeenCalledWith("intake_id", "intake-1")
    expect(mocks.readAnswers).toHaveBeenCalledWith({
      answers: { fallback: true },
      answers_enc: encrypted,
    })
    expect(answers).toMatchObject({ medications: [expect.objectContaining({ name: "Atorvastatin" })] })
  })

  it("maps consult subtypes to the canonical operator-facing labels", async () => {
    const context = await import("@/lib/notifications/request-context").catch(() => null)
    expect(context).not.toBeNull()
    if (!context) return

    expect(context.getTelegramConsultLabel("ed")).toBe("Erectile dysfunction")
    expect(context.getTelegramConsultLabel("hair_loss")).toBe("Hair loss treatment")
    expect(context.getTelegramConsultLabel("womens_health")).toBe("Women's health")
    expect(context.getTelegramConsultLabel("weight_loss")).toBe("Weight management")
    expect(context.getTelegramConsultLabel("general")).toBeUndefined()
  })

  it("extracts only the canonical medicine label from a prescription request", async () => {
    const context = await import("@/lib/notifications/request-context").catch(() => null)
    expect(context).not.toBeNull()
    if (!context) return

    const detail = context.getTelegramRequestDetail({
      serviceSlug: "common-scripts",
      answers: {
        medications: [{
          name: "Atorvastatin",
          strength: "20 mg",
          form: "tablet",
          description: "Do not forward this free-text patient note",
        }],
        symptoms: "Do not forward symptoms",
      },
    })

    expect(detail).toBe("Atorvastatin 20 mg tablet")
    expect(detail).not.toContain("note")
    expect(detail).not.toContain("symptoms")
  })

  it("keeps dynamic detail single-line, control-free, and bounded", async () => {
    const context = await import("@/lib/notifications/request-context").catch(() => null)
    expect(context).not.toBeNull()
    if (!context) return

    const detail = context.sanitizeTelegramRequestDetail(`  Medicine\n\t${"x".repeat(100)}\u0000  `)

    expect(Array.from(detail ?? "").every((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint > 31 && codePoint !== 127
    })).toBe(true)
    expect(detail?.length).toBeLessThanOrEqual(80)
    expect(detail?.endsWith("…")).toBe(true)
  })
})
