import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/observability/logger", () => ({ createLogger: () => ({ error: vi.fn(), warn: vi.fn(), debug: vi.fn() }) }))
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv("PHI_MASTER_KEY", Buffer.alloc(32, 1).toString("base64"))
  vi.stubEnv("PHI_ENCRYPTION_READ_ENABLED", "true")
})
afterEach(() => vi.unstubAllEnvs())

describe("doctor note field persistence", () => {
  it.each([true, false])("preserves deliberately cleared notes with encryption enabled=%s", async (enabled) => {
    vi.stubEnv("PHI_ENCRYPTION_ENABLED", String(enabled))
    vi.stubEnv("PHI_ENCRYPTION_WRITE_ENABLED", String(enabled))
    const { prepareDoctorNotesWrite, readDoctorNotes } = await import("@/lib/security/phi-field-wrappers")
    const stored = await prepareDoctorNotesWrite("")
    expect(stored.doctor_notes).toBe("")
    if (enabled) expect(stored.doctor_notes_enc).not.toBeNull()
    else expect(stored.doctor_notes_enc).toBeNull()
    expect(await readDoctorNotes(stored)).toBe("")
    expect(await prepareDoctorNotesWrite(null)).toEqual({ doctor_notes: null, doctor_notes_enc: null })
    expect(await readDoctorNotes({ doctor_notes: null })).toBeNull()
  })
  it("still fails closed when encryption of a cleared note fails", async () => {
    vi.stubEnv("PHI_ENCRYPTION_ENABLED", "true")
    vi.stubEnv("PHI_ENCRYPTION_WRITE_ENABLED", "true")
    vi.stubEnv("PHI_MASTER_KEY", "")
    const { prepareDoctorNotesWrite } = await import("@/lib/security/phi-field-wrappers")
    await expect(prepareDoctorNotesWrite("")).rejects.toThrow("refusing to store plaintext-only")
  })
})
