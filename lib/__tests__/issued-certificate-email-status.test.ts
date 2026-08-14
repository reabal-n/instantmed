import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  rpcData: true as boolean | null,
  rpcError: null as { message: string } | null,
  rpc: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    rpc: state.rpc,
  }),
}))

import { updateEmailStatus } from "@/lib/data/issued-certificates"

describe("issued certificate email status reconciliation", () => {
  beforeEach(() => {
    state.rpcData = true
    state.rpcError = null
    state.rpc.mockReset()
    state.rpc.mockImplementation(async () => ({
      data: state.rpcData,
      error: state.rpcError,
    }))
  })

  it("returns failure when atomic delivery reconciliation errors", async () => {
    state.rpcError = { message: "delivery reconciliation failed" }

    await expect(updateEmailStatus("certificate-1", "sent", {
      deliveryId: "resend-message-1",
      expectedStoragePath: "certificates/intake-1/v1.pdf",
    })).resolves.toEqual({
      success: false,
      error: "delivery reconciliation failed",
    })
  })

  it("fails closed when the certificate version compare-and-set no longer matches", async () => {
    state.rpcData = false

    await expect(updateEmailStatus("certificate-1", "sent", {
      deliveryId: "resend-message-1",
      expectedStoragePath: "certificates/intake-1/v1.pdf",
    })).resolves.toEqual({
      success: false,
      error: "Certificate document version changed before email reconciliation",
    })
  })

  it("delegates certificate and intake delivery truth to one version-locked transaction", async () => {
    await expect(updateEmailStatus("certificate-1", "sent", {
      deliveryId: "resend-message-1",
      expectedStoragePath: "certificates/intake-1/v1.pdf",
    })).resolves.toEqual({ success: true })

    expect(state.rpc).toHaveBeenCalledWith("reconcile_certificate_email_status", {
      p_certificate_id: "certificate-1",
      p_expected_storage_path: "certificates/intake-1/v1.pdf",
      p_status: "sent",
      p_delivery_id: "resend-message-1",
      p_failure_reason: null,
    })
  })
})
