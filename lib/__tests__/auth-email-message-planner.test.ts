import { describe, expect, it } from "vitest"

import {
  planAuthEmailMessages,
  type SupabaseAuthHookPayload,
} from "@/lib/auth/auth-email-message-planner"

const APP_URL = "https://instantmed.test"

function payload(
  overrides: Partial<SupabaseAuthHookPayload["email_data"]> = {},
  userOverrides: Partial<SupabaseAuthHookPayload["user"]> = {},
): SupabaseAuthHookPayload {
  return {
    user: {
      id: "user-123",
      email: "current@example.com",
      ...userOverrides,
    },
    email_data: {
      token: "111111",
      token_hash: "hash-primary",
      redirect_to: `${APP_URL}/auth/callback?next=${encodeURIComponent("/patient/settings")}`,
      email_action_type: "magiclink",
      site_url: "https://project.supabase.co",
      ...overrides,
    },
  }
}

function expectPlan(result: ReturnType<typeof planAuthEmailMessages>) {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error)
  return result.messages
}

function getConfirmationParams(confirmationUrl: string | undefined) {
  const url = new URL(confirmationUrl ?? "")
  return {
    url,
    params: new URLSearchParams(url.hash.slice(1)),
  }
}

describe("planAuthEmailMessages", () => {
  it("builds a scanner-safe app confirmation link with only a safe relative next path", () => {
    const [message] = expectPlan(planAuthEmailMessages(payload(), { appUrl: APP_URL }))

    expect(message.to).toBe("current@example.com")
    expect(message.actionType).toBe("magiclink")
    expect(message.verificationCode).toBeUndefined()
    expect(message.idempotencyKey).toMatch(/^supabase-auth\/magiclink\/[a-f0-9]{64}$/)
    expect(message.idempotencyKey).not.toContain("current@example.com")
    expect(message.idempotencyKey).not.toContain("hash-primary")

    const { url, params } = getConfirmationParams(message.confirmationUrl)
    expect(url.origin).toBe(APP_URL)
    expect(url.pathname).toBe("/auth/confirm")
    expect(url.search).toBe("")
    expect(params.get("token_hash")).toBe("hash-primary")
    expect(params.get("type")).toBe("magiclink")
    expect(params.get("next")).toBe("/patient/settings")
    expect(params.has("redirect_to")).toBe(false)
    expect(url.toString()).not.toContain("current%40example.com")
    expect(url.toString()).not.toContain("project.supabase.co/auth/v1/verify")
  })

  it("drops an external redirect instead of putting it into the confirmation URL", () => {
    const [message] = expectPlan(planAuthEmailMessages(payload({
      redirect_to: "https://evil.example/auth/callback?next=https%3A%2F%2Fevil.example%2Fphish",
    }), { appUrl: APP_URL }))

    const { url, params } = getConfirmationParams(message.confirmationUrl)
    expect(params.has("next")).toBe(false)
    expect(url.toString()).not.toContain("evil.example")
  })

  it("maps both secure email-change hashes to the correct recipients", () => {
    const messages = expectPlan(planAuthEmailMessages(payload({
      email_action_type: "email_change",
      token: "111111",
      token_hash: "hash-for-new-address",
      token_new: "222222",
      token_hash_new: "hash-for-current-address",
    }, {
      new_email: "new@example.com",
    }), { appUrl: APP_URL }))

    expect(messages).toHaveLength(2)
    expect(messages.map((message) => ({
      to: message.to,
      audience: message.emailChangeAudience,
      tokenHash: getConfirmationParams(message.confirmationUrl).params.get("token_hash"),
    }))).toEqual([
      {
        to: "current@example.com",
        audience: "current",
        tokenHash: "hash-for-current-address",
      },
      {
        to: "new@example.com",
        audience: "new",
        tokenHash: "hash-for-new-address",
      },
    ])
  })

  it("sends one insecure email-change confirmation to the new address", () => {
    const messages = expectPlan(planAuthEmailMessages(payload({
      email_action_type: "email_change",
      token_hash: "hash-for-new-address",
      token_hash_new: "",
    }, {
      new_email: "new@example.com",
    }), { appUrl: APP_URL }))

    expect(messages).toHaveLength(1)
    expect(messages[0]?.to).toBe("new@example.com")
    expect(messages[0]?.emailChangeAudience).toBe("new")
    expect(getConfirmationParams(messages[0]?.confirmationUrl).params.get("token_hash"))
      .toBe("hash-for-new-address")
  })

  it("plans reauthentication as an OTP email without a confirmation link", () => {
    const [message] = expectPlan(planAuthEmailMessages(payload({
      email_action_type: "reauthentication",
      token: "654321",
      token_hash: "unused-hash",
    }), { appUrl: APP_URL }))

    expect(message.to).toBe("current@example.com")
    expect(message.verificationCode).toBe("654321")
    expect(message.confirmationUrl).toBeUndefined()
    expect(message.idempotencyKey).not.toContain("654321")
  })

  it("keeps provider retries idempotent while separating two-address email changes", () => {
    const input = payload({
      email_action_type: "email_change",
      token_hash: "hash-for-new-address",
      token_hash_new: "hash-for-current-address",
    }, {
      new_email: "new@example.com",
    })
    const firstPlan = expectPlan(planAuthEmailMessages(input, { appUrl: APP_URL }))
    const retryPlan = expectPlan(planAuthEmailMessages(input, { appUrl: APP_URL }))

    expect(retryPlan.map((message) => message.idempotencyKey))
      .toEqual(firstPlan.map((message) => message.idempotencyKey))
    expect(new Set(firstPlan.map((message) => message.idempotencyKey)).size).toBe(2)
  })

  it("rejects email-change payloads that do not identify the new address", () => {
    const result = planAuthEmailMessages(payload({
      email_action_type: "email_change",
    }), { appUrl: APP_URL })

    expect(result).toEqual({ ok: false, error: "Missing new email address" })
  })
})
