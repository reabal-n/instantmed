import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  certificateLookupError: null as { message: string } | null,
  intakeMirrorError: null as { message: string } | null,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === "issued_certificates") {
        const updateChain: Record<string, unknown> = {}
        updateChain.eq = vi.fn(() => updateChain)
        updateChain.select = vi.fn(() => updateChain)
        updateChain.maybeSingle = vi.fn(async () => ({
          data: state.certificateLookupError ? null : { intake_id: "intake-1" },
          error: state.certificateLookupError,
        }))
        return {
          update: () => updateChain,
        }
      }

      if (table === "intakes") {
        return {
          update: () => ({
            eq: () => ({
              is: async () => ({ error: state.intakeMirrorError }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }),
}))

import { updateEmailStatus } from "@/lib/data/issued-certificates"

describe("issued certificate email status reconciliation", () => {
  beforeEach(() => {
    state.certificateLookupError = null
    state.intakeMirrorError = null
  })

  it("returns failure when it cannot resolve the intake delivery mirror", async () => {
    state.certificateLookupError = { message: "certificate lookup failed" }

    await expect(updateEmailStatus("certificate-1", "sent", {
      deliveryId: "resend-message-1",
    })).resolves.toEqual({
      success: false,
      error: "certificate lookup failed",
    })
  })

  it("returns failure when document_sent_at cannot be mirrored onto the intake", async () => {
    state.intakeMirrorError = { message: "intake mirror failed" }

    await expect(updateEmailStatus("certificate-1", "sent", {
      deliveryId: "resend-message-1",
    })).resolves.toEqual({
      success: false,
      error: "intake mirror failed",
    })
  })

  it("reports success only after the certificate and intake delivery writes reconcile", async () => {
    await expect(updateEmailStatus("certificate-1", "sent", {
      deliveryId: "resend-message-1",
    })).resolves.toEqual({ success: true })
  })
})
