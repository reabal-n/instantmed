import { captureException } from "@sentry/nextjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const log = vi.hoisted(() => ({ error: vi.fn() }))
vi.mock("@/lib/observability/logger", () => ({ createLogger: () => log }))
import { reportCheckoutPersistenceFailure, reportCheckoutProviderFailure } from "@/lib/observability/checkout-persistence-diagnostics"

describe("checkout recovery diagnostic grouping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("groups database failures by bounded operation and SQLSTATE without a second logger capture", () => {
    reportCheckoutPersistenceFailure("owned_duplicate_lookup", "08006")
    expect(captureException).toHaveBeenCalledExactlyOnceWith(expect.any(Error), {
      tags: { source: "checkout-persistence", operation: "owned_duplicate_lookup", database_code: "08006" },
      fingerprint: ["checkout-persistence", "owned_duplicate_lookup", "08006"],
    })
    expect(log.error).toHaveBeenCalledExactlyOnceWith("Checkout persistence operation failed", { operation: "owned_duplicate_lookup", databaseCode: "08006" })
  })

  it("never promotes a raw provider or invalid database payload into the diagnostic", () => {
    reportCheckoutPersistenceFailure("draft_checkout_claim", "secret patient@example.test")
    reportCheckoutProviderFailure("restored_session_inspect")
    expect(captureException).toHaveBeenLastCalledWith(expect.any(Error), {
      tags: { source: "checkout-provider", operation: "restored_session_inspect" },
      fingerprint: ["checkout-provider", "restored_session_inspect"],
    })
    expect(JSON.stringify(vi.mocked(captureException).mock.calls)).not.toMatch(/secret|example.test/)
    expect(vi.mocked(captureException).mock.calls[0][1]).toMatchObject({ tags: { database_code: "unknown" } })
  })

  it("preserves the recovery result if the diagnostic provider throws", () => {
    vi.mocked(captureException).mockImplementationOnce(() => { throw new Error("provider unavailable") })
    expect(() => reportCheckoutProviderFailure("restored_session_inspect")).not.toThrow()
  })
})
