import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)

  return {
    decryptJSONB: vi.fn(),
    from: vi.fn(() => query),
    query,
  }
})

vi.mock("@/lib/security/phi-encryption", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/phi-encryption")>()
  return {
    ...actual,
    decryptJSONB: mocks.decryptJSONB,
  }
})

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: mocks.from }),
}))

import { getIntakeAnswersForPaymentSafety } from "@/lib/data/intake-answers"

const validEnvelope = {
  authTag: "auth-tag",
  ciphertext: "ciphertext",
  encryptedDataKey: "encrypted-data-key",
  iv: "iv",
  keyId: "key-1",
  version: 1,
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    allergy_details: null,
    allergy_details_enc: null,
    answers: { symptomDetails: "stale benign plaintext" },
    answers_encrypted: validEnvelope,
    created_at: "2026-07-14T00:00:00.000Z",
    encryption_metadata: null,
    id: "answers-1",
    intake_id: "intake-1",
    medical_conditions: null,
    medical_conditions_enc: null,
    updated_at: "2026-07-14T00:00:00.000Z",
    ...overrides,
  }
}

describe("authoritative intake-answer reads for payment safety", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("PHI_ENCRYPTION_ENABLED", "true")
    vi.stubEnv("PHI_ENCRYPTION_READ_ENABLED", "true")
    mocks.query.single.mockResolvedValue({ data: row(), error: null })
    mocks.decryptJSONB.mockResolvedValue({
      symptomDetails: "Need to defer an exam",
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("uses the decrypted envelope instead of stale plaintext", async () => {
    await expect(getIntakeAnswersForPaymentSafety("intake-1")).resolves.toEqual({
      symptomDetails: "Need to defer an exam",
    })
    expect(mocks.decryptJSONB).toHaveBeenCalledWith(validEnvelope)
  })

  it("fails closed when encrypted reads are disabled", async () => {
    vi.stubEnv("PHI_ENCRYPTION_READ_ENABLED", "false")

    await expect(getIntakeAnswersForPaymentSafety("intake-1")).resolves.toBeNull()
    expect(mocks.decryptJSONB).not.toHaveBeenCalled()
  })

  it.each([
    "PHI_MASTER_KEY environment variable not set",
    "PHI decryption failed",
  ])("fails closed when an encrypted envelope cannot be decrypted: %s", async (message) => {
    mocks.decryptJSONB.mockRejectedValueOnce(new Error(message))

    await expect(getIntakeAnswersForPaymentSafety("intake-1")).resolves.toBeNull()
  })

  it("fails closed when the encrypted envelope is malformed", async () => {
    mocks.query.single.mockResolvedValue({
      data: row({ answers_encrypted: { ciphertext: "incomplete" } }),
      error: null,
    })

    await expect(getIntakeAnswersForPaymentSafety("intake-1")).resolves.toBeNull()
    expect(mocks.decryptJSONB).not.toHaveBeenCalled()
  })

  it("allows plaintext only for a legacy row with no encrypted envelope", async () => {
    mocks.query.single.mockResolvedValue({
      data: row({
        answers: { symptomDetails: "legacy plaintext" },
        answers_encrypted: null,
      }),
      error: null,
    })

    await expect(getIntakeAnswersForPaymentSafety("intake-1")).resolves.toEqual({
      symptomDetails: "legacy plaintext",
    })
    expect(mocks.decryptJSONB).not.toHaveBeenCalled()
  })

  it.each([null, "not-an-object", [], 42])(
    "fails closed for invalid legacy plaintext answers: %j",
    async (answers) => {
      mocks.query.single.mockResolvedValue({
        data: row({ answers, answers_encrypted: null }),
        error: null,
      })

      await expect(getIntakeAnswersForPaymentSafety("intake-1")).resolves.toBeNull()
    },
  )

  it("fails closed when decrypted ciphertext does not contain an answer object", async () => {
    mocks.decryptJSONB.mockResolvedValueOnce([])

    await expect(getIntakeAnswersForPaymentSafety("intake-1")).resolves.toBeNull()
  })
})
