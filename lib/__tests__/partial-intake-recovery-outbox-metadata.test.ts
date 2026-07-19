import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: mocks.from,
  }),
}))

import {
  persistPartialRecoveryTrackingId,
} from "@/lib/email/send/outbox"

describe("partial-intake recovery outbox metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const chain = {
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
      select: mocks.select,
      update: mocks.update,
    }
    mocks.from.mockReturnValue(chain)
    mocks.update.mockReturnValue(chain)
    mocks.eq.mockReturnValue(chain)
    mocks.select.mockReturnValue(chain)
    mocks.maybeSingle.mockResolvedValue({
      data: { id: "outbox-1" },
      error: null,
    })
  })

  it("persists only the new non-bearer correlation and scrubs legacy context", async () => {
    const metadata: Record<string, unknown> = {
      _provider_payload_enc: "encrypted-frozen-provider-body",
      draft_idempotency_hash: "legacy-digest",
      draft_session_id: "legacy-session",
      resume_url: "https://instantmed.example/request?d=secret",
      service_type: "med-cert",
      safe_transport_flag: true,
      session_id: "secret-session",
    }

    await expect(persistPartialRecoveryTrackingId(
      "outbox-1",
      metadata,
      "tracking-1",
    )).resolves.toBe(true)

    expect(mocks.update).toHaveBeenCalledWith({
      metadata: {
        _provider_payload_enc: "encrypted-frozen-provider-body",
        recovery_tracking_id: "tracking-1",
        safe_transport_flag: true,
      },
    })
    expect(metadata).toEqual({
      _provider_payload_enc: "encrypted-frozen-provider-body",
      recovery_tracking_id: "tracking-1",
      safe_transport_flag: true,
    })
    expect(mocks.eq).toHaveBeenCalledWith("id", "outbox-1")
    expect(mocks.eq).toHaveBeenCalledWith("status", "sending")
  })

  it("does not mutate in-memory metadata when the CAS write fails", async () => {
    const metadata = {
      draft_idempotency_hash: "legacy-digest",
    }
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    await expect(persistPartialRecoveryTrackingId(
      "outbox-1",
      metadata,
      "tracking-1",
    )).resolves.toBe(false)

    expect(metadata).toEqual({
      draft_idempotency_hash: "legacy-digest",
    })
  })
})
