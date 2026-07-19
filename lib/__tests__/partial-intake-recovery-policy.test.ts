import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  decryptJSONB: vi.fn(),
  getEmailBounceSuppressionDecision: vi.fn(),
  getEmailSuppressionDecisions: vi.fn(),
  queryCalls: [] as Array<{ method: string; args: unknown[] }>,
  selectResults: [] as Array<{ data: unknown; error: unknown }>,
}))

vi.mock("server-only", () => ({}))

vi.mock("@/lib/config/env", () => ({
  env: {
    appUrl: "https://instantmed.example",
    isDev: false,
  },
  getAppUrl: () => "https://instantmed.example",
}))

vi.mock("@/lib/security/phi-encryption", () => ({
  decryptJSONB: mocks.decryptJSONB,
}))

vi.mock("@/lib/email/utils", () => ({
  getEmailBounceSuppressionDecision:
    mocks.getEmailBounceSuppressionDecision,
}))

vi.mock("@/lib/email/suppression", () => ({
  getEmailSuppressionDecisions: mocks.getEmailSuppressionDecisions,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      mocks.queryCalls.push({ method: "from", args: [table] })
      const chain = {
        select(...args: unknown[]) {
          mocks.queryCalls.push({ method: "select", args })
          return chain
        },
        eq(...args: unknown[]) {
          mocks.queryCalls.push({ method: "eq", args })
          return chain
        },
        maybeSingle() {
          mocks.queryCalls.push({ method: "maybeSingle", args: [] })
          return Promise.resolve(
            mocks.selectResults.shift() ?? { data: null, error: null },
          )
        },
      }
      return chain
    },
  }),
}))

import {
  evaluatePartialIntakeRecoveryPolicy,
  resolvePartialIntakeRecoveryTrackingId,
  validatePartialIntakeRecoveryProviderPayload,
} from "@/lib/email/partial-intake-recovery-policy"

const NOW = new Date("2026-07-19T08:00:00.000Z")
const TRACKING_ID = "a6bd50f7-ad78-4fba-9822-a89580b58bf7"
const SESSION_ID = "11111111-1111-4111-8111-111111111111"
const EMAIL = "alex.taylor@patientmail.com.au"

function draftRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    recovery_tracking_id: TRACKING_ID,
    session_id: SESSION_ID,
    service_type: "med-cert",
    current_step_id: "details",
    email: EMAIL,
    first_name: "Alex",
    updated_at: "2026-07-19T07:00:00.000Z",
    expires_at: "2026-07-26T08:00:00.000Z",
    converted_to_intake_id: null,
    recovery_email_sent_at: null,
    recovery_email_suppressed_at: null,
    answers: {},
    answers_encrypted: null,
    ...overrides,
  }
}

function queueSelect(data: unknown, error: unknown = null) {
  mocks.selectResults.push({ data, error })
}

function evaluate(
  row: Record<string, unknown>,
  overrides: Partial<Parameters<
    typeof evaluatePartialIntakeRecoveryPolicy
  >[0]> = {},
) {
  queueSelect(row)
  return evaluatePartialIntakeRecoveryPolicy({
    recoveryTrackingId: TRACKING_ID,
    expectedRecipient: EMAIL,
    expectedUpdatedAt: row.updated_at as string,
    mode: "initial",
    now: NOW,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.queryCalls.length = 0
  mocks.selectResults.length = 0
  mocks.decryptJSONB.mockResolvedValue({})
  mocks.getEmailBounceSuppressionDecision.mockResolvedValue({
    kind: "allowed",
  })
  mocks.getEmailSuppressionDecisions.mockResolvedValue(
    new Map([[EMAIL, { kind: "allowed" }]]),
  )
})

describe("partial-intake recovery authoritative policy", () => {
  it("reads by the non-bearer tracking ID and returns the authoritative URL", async () => {
    const result = await evaluate(draftRow())

    expect(result).toMatchObject({
      kind: "allowed",
      draft: {
        recoveryTrackingId: TRACKING_ID,
        sessionId: SESSION_ID,
        email: EMAIL,
      },
    })
    expect(result.kind === "allowed" && result.draft.resumeUrl).toContain(
      `d=${SESSION_ID}`,
    )
    expect(mocks.queryCalls).toContainEqual({
      method: "eq",
      args: ["recovery_tracking_id", TRACKING_ID],
    })
  })

  it.each([
    ["converted", { converted_to_intake_id: "intake-1" }, "draft_converted"],
    [
      "expired",
      { expires_at: "2026-07-19T08:00:00.000Z" },
      "draft_expired",
    ],
    [
      "already sent",
      { recovery_email_sent_at: "2026-07-19T07:30:00.000Z" },
      "recovery_already_handled",
    ],
    [
      "already suppressed",
      { recovery_email_suppressed_at: "2026-07-19T07:30:00.000Z" },
      "recovery_already_handled",
    ],
    ["synthetic", { email: "patient@example.com" }, "test_identity"],
  ])("terminally suppresses a %s draft", async (_label, overrides, reason) => {
    const row = draftRow(overrides)
    const result = await evaluate(row, {
      expectedRecipient: row.email as string,
    })

    expect(result).toEqual({ kind: "policy_suppressed", reason })
  })

  it("suppresses when the authoritative recipient changed", async () => {
    const result = await evaluate(draftRow({
      email: "changed@patientmail.com.au",
    }))

    expect(result).toEqual({
      kind: "policy_suppressed",
      reason: "recipient_changed",
    })
  })

  it("keeps initial and dispatcher idle windows distinct", async () => {
    const active = draftRow({ updated_at: "2026-07-19T07:30:00.000Z" })
    const tooOld = draftRow({ updated_at: "2026-07-19T01:59:59.999Z" })

    await expect(evaluate(active)).resolves.toMatchObject({
      kind: "transiently_blocked",
      reason: "draft_still_active",
    })
    await expect(evaluate(tooOld)).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "recovery_window_expired",
    })
    await expect(evaluate(tooOld, {
      mode: "dispatcher",
      expectedUpdatedAt: undefined,
    })).resolves.toMatchObject({ kind: "allowed" })
  })

  it("transiently blocks a changed initial snapshot and read failure", async () => {
    await expect(evaluate(draftRow(), {
      expectedUpdatedAt: "2026-07-19T06:59:59.000Z",
    })).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "draft_snapshot_changed",
    })

    queueSelect(null, { message: "database unavailable" })
    await expect(evaluatePartialIntakeRecoveryPolicy({
      recoveryTrackingId: TRACKING_ID,
      expectedRecipient: EMAIL,
      mode: "dispatcher",
      now: NOW,
    })).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "draft_read_failed",
    })
  })

  it("rechecks encrypted subtype availability and fails closed on decrypt errors", async () => {
    const encrypted = {
      authTag: "tag",
      ciphertext: "ciphertext",
      encryptedDataKey: "key",
      iv: "iv",
      keyId: "key-id",
      version: 1,
    }
    const consult = draftRow({
      answers: {},
      answers_encrypted: encrypted,
      service_type: "consult",
    })

    mocks.decryptJSONB.mockResolvedValueOnce({ consultSubtype: "hair_loss" })
    await expect(evaluate(consult)).resolves.toMatchObject({
      kind: "allowed",
      draft: {
        resumeUrl: expect.stringContaining("subtype=hair_loss"),
      },
    })

    mocks.decryptJSONB.mockResolvedValueOnce({ consultSubtype: "weight_loss" })
    await expect(evaluate(consult)).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "draft_not_resumable",
    })

    mocks.decryptJSONB.mockRejectedValueOnce(new Error("decrypt failed"))
    await expect(evaluate(consult)).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "draft_decrypt_failed",
    })
  })

  it("supports the bounded legacy plaintext-answer fallback", async () => {
    const result = await evaluate(draftRow({
      answers: { consultSubtype: "ed" },
      answers_encrypted: null,
      service_type: "consult",
    }))

    expect(result).toMatchObject({
      kind: "allowed",
      draft: {
        resumeUrl: expect.stringContaining("subtype=ed"),
      },
    })
  })

  it("matches the live recovery validator for women's-health child pathways", async () => {
    const encrypted = {
      authTag: "tag",
      ciphertext: "ciphertext",
      encryptedDataKey: "key",
      iv: "iv",
      keyId: "key-id",
      version: 1,
    }
    const consult = draftRow({
      answers: {},
      answers_encrypted: encrypted,
      current_step_id: "womens-health-assessment",
      service_type: "consult",
    })

    mocks.decryptJSONB.mockResolvedValueOnce({
      consultSubtype: "womens_health",
      womensHealthOption: "uti",
    })
    await expect(evaluate(consult)).resolves.toMatchObject({
      kind: "allowed",
      draft: {
        resumeUrl: expect.stringContaining("subtype=womens_health"),
      },
    })

    mocks.decryptJSONB.mockResolvedValueOnce({
      consultSubtype: "womens_health",
      womensHealthOption: "ocp_repeat",
    })
    await expect(evaluate(consult)).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "draft_not_resumable",
    })
  })

  it("distinguishes terminal suppression from transient bounce/read state", async () => {
    mocks.getEmailBounceSuppressionDecision.mockResolvedValueOnce({
      kind: "policy_suppressed",
    })
    await expect(evaluate(draftRow())).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "address_bounced_or_complained",
    })

    mocks.getEmailSuppressionDecisions.mockResolvedValueOnce(
      new Map([[EMAIL, { kind: "transiently_blocked" }]]),
    )
    await expect(evaluate(draftRow())).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "address_suppression_read_failed",
    })
  })

  it("keeps a confirmed opt-out terminal when the bounce lookup is transient", async () => {
    mocks.getEmailBounceSuppressionDecision.mockResolvedValueOnce({
      kind: "transiently_blocked",
      reason: "lookup_failed",
    })
    mocks.getEmailSuppressionDecisions.mockResolvedValueOnce(
      new Map([[EMAIL, { kind: "policy_suppressed" }]]),
    )

    await expect(evaluate(draftRow())).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "address_suppressed",
    })
  })

  it("turns an unexpected policy dependency failure into a retryable decision", async () => {
    mocks.getEmailSuppressionDecisions.mockRejectedValueOnce(
      new Error("dependency threw"),
    )

    await expect(evaluate(draftRow())).resolves.toEqual({
      kind: "transiently_blocked",
      reason: "policy_recheck_failed",
    })
  })
})

describe("partial-intake recovery frozen payload policy", () => {
  const resumeUrl =
    `https://instantmed.example/request?service=med-cert&d=${SESSION_ID}` +
    "&utm_source=recovery_email&utm_medium=email" +
    "&utm_campaign=partial_intake_recovery&utm_content=med-cert"

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      from: "InstantMed <support@instantmed.example>",
      to: [EMAIL],
      subject: "Your request is still saved",
      html: `<a href="${resumeUrl.replaceAll("&", "&amp;")}">Continue</a>`,
      text: `Continue your request (${resumeUrl})`,
      ...overrides,
    }
  }

  it("requires the exact authoritative URL in both HTML and text", () => {
    expect(validatePartialIntakeRecoveryProviderPayload(
      payload(),
      { email: EMAIL, resumeUrl },
    )).toEqual({ kind: "allowed" })

    expect(validatePartialIntakeRecoveryProviderPayload(
      payload({ html: "<p>No resume link</p>" }),
      { email: EMAIL, resumeUrl },
    )).toEqual({
      kind: "policy_suppressed",
      reason: "recovery_payload_route_changed",
    })
    expect(validatePartialIntakeRecoveryProviderPayload(
      payload({ text: "No resume link" }),
      { email: EMAIL, resumeUrl },
    )).toEqual({
      kind: "policy_suppressed",
      reason: "recovery_payload_route_changed",
    })
    expect(validatePartialIntakeRecoveryProviderPayload(
      payload({
        html:
          `<p>${resumeUrl}</p>` +
          '<a href="https://instantmed.example/request">Stale link</a>',
      }),
      { email: EMAIL, resumeUrl },
    )).toEqual({
      kind: "policy_suppressed",
      reason: "recovery_payload_route_changed",
    })

    const staleResumeUrl = resumeUrl.replace(SESSION_ID, "22222222-2222-4222-8222-222222222222")
    expect(validatePartialIntakeRecoveryProviderPayload(
      payload({
        html:
          `<a href="${resumeUrl.replaceAll("&", "&amp;")}">Continue</a>` +
          `<a href="${staleResumeUrl.replaceAll("&", "&amp;")}">Old</a>`,
        text: `Continue (${resumeUrl}) or old (${staleResumeUrl})`,
      }),
      { email: EMAIL, resumeUrl },
    )).toEqual({
      kind: "policy_suppressed",
      reason: "recovery_payload_route_changed",
    })

    expect(validatePartialIntakeRecoveryProviderPayload(
      payload({
        html:
          `<a href="${resumeUrl.replaceAll("&", "&amp;")}">Continue</a>` +
          `<p>Old link: ${staleResumeUrl.replaceAll("&", "&amp;")}</p>`,
      }),
      { email: EMAIL, resumeUrl },
    )).toEqual({
      kind: "policy_suppressed",
      reason: "recovery_payload_route_changed",
    })
  })

  it("requires one frozen recipient matching the authoritative draft", () => {
    expect(validatePartialIntakeRecoveryProviderPayload(
      payload({ to: ["changed@patientmail.com.au"] }),
      { email: EMAIL, resumeUrl },
    )).toEqual({
      kind: "policy_suppressed",
      reason: "recovery_payload_recipient_changed",
    })
  })

  it("maps an inherited frozen row without copying its bearer into metadata", async () => {
    queueSelect({ recovery_tracking_id: TRACKING_ID })
    const result = await resolvePartialIntakeRecoveryTrackingId({
      expectedRecipient: EMAIL,
      providerPayload: payload(),
    })

    expect(result).toEqual({
      kind: "resolved",
      recoveryTrackingId: TRACKING_ID,
      legacyMapped: true,
    })
    expect(mocks.queryCalls).toContainEqual({
      method: "eq",
      args: ["session_id", SESSION_ID],
    })
  })

  it("fails closed when an inherited row cannot be mapped safely", async () => {
    await expect(resolvePartialIntakeRecoveryTrackingId({
      expectedRecipient: EMAIL,
      providerPayload: payload({ text: "No resume link" }),
    })).resolves.toEqual({
      kind: "policy_suppressed",
      reason: "recovery_tracking_missing",
    })

    queueSelect(null, { message: "database unavailable" })
    await expect(resolvePartialIntakeRecoveryTrackingId({
      expectedRecipient: EMAIL,
      providerPayload: payload(),
    })).resolves.toMatchObject({
      kind: "transiently_blocked",
      reason: "legacy_recovery_mapping_read_failed",
    })
  })
})
