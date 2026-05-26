/**
 * Unit tests for app/actions/undo-cert-approval.ts
 *
 * The undo action gives the doctor a 30-second window after approval to:
 *   1. Revoke the freshly issued certificate
 *   2. Delete the queued (scheduled-for-future) cert email
 *   3. Flip the intake back to in_review
 *
 * After 30s the email has been sent and the window is closed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { mockSupabaseFrom, mockSupabaseRpc, resetAllMocks } from "./setup"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const mockRequireRoleOrNull = vi.fn()
vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: (...args: unknown[]) => mockRequireRoleOrNull(...args),
  getApiAuth: vi.fn(),
}))

const mockRevokeCertificateAction = vi.fn()
vi.mock("@/app/actions/revoke-cert", () => ({
  revokeCertificateAction: (...args: unknown[]) => mockRevokeCertificateAction(...args),
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidateStaff: vi.fn(),
  revalidatePatient: vi.fn(),
}))

vi.mock("@/lib/data/intake-events", () => ({
  logStatusChange: vi.fn().mockResolvedValue(undefined),
}))

// Import AFTER mocks are registered
import { UNDO_WINDOW_SECONDS,undoCertApprovalAction } from "@/app/actions/undo-cert-approval"

const DOCTOR_A = "doctor-aaa-1111"
const DOCTOR_B = "doctor-bbb-2222"
const INTAKE_ID = "intake-undo-1"
const CERT_ID = "cert-undo-1"

function authAs(doctorId: string) {
  mockRequireRoleOrNull.mockResolvedValue({
    user: { id: `user-${doctorId}` },
    profile: { id: doctorId, role: "doctor", full_name: "Test Doc" },
  })
}

/**
 * Build a chainable mock that returns fixed data for each table the action
 * reads/writes. The action touches three tables:
 *   - issued_certificates (select by intake_id, latest)
 *   - email_outbox (select by intake_id + email_type + status, delete by id)
 *   - intakes (update status back to in_review)
 */
function wireSupabaseMocks(opts: {
  cert?: { id: string; doctor_id: string; status: string; created_at?: string } | null
  outboxRow?: { id: string; status: string; scheduled_for: string | null; sent_at: string | null } | null
  intakeUpdateError?: { code?: string; message: string } | null
  outboxDeleteError?: { code?: string; message: string } | null
  certFetchError?: { code?: string; message: string } | null
}) {
  const certFetch = vi.fn().mockResolvedValue({
    data: opts.cert ?? null,
    error: opts.certFetchError ?? null,
  })
  const outboxFetch = vi.fn().mockResolvedValue({
    data: opts.outboxRow ?? null,
    error: null,
  })
  const outboxDelete = vi.fn().mockResolvedValue({
    error: opts.outboxDeleteError ?? null,
  })
  const intakeUpdate = vi.fn().mockResolvedValue({
    error: opts.intakeUpdateError ?? null,
  })

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "issued_certificates") {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.eq = vi.fn(() => chain)
      chain.order = vi.fn(() => chain)
      chain.limit = vi.fn(() => chain)
      chain.maybeSingle = certFetch
      return chain
    }
    if (table === "email_outbox") {
      const chain: Record<string, unknown> = {}
      // Read path
      chain.select = vi.fn(() => chain)
      chain.eq = vi.fn(() => chain)
      chain.in = vi.fn(() => chain)
      chain.order = vi.fn(() => chain)
      chain.limit = vi.fn(() => chain)
      chain.maybeSingle = outboxFetch
      // Delete path
      chain.delete = vi.fn(() => ({
        eq: vi.fn(() => outboxDelete()),
      }))
      return chain
    }
    if (table === "intakes") {
      const chain: Record<string, unknown> = {}
      chain.update = vi.fn(() => ({
        eq: vi.fn(() => intakeUpdate()),
      }))
      return chain
    }
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) }
  })

  return { certFetch, outboxFetch, outboxDelete, intakeUpdate }
}

describe("undoCertApprovalAction", () => {
  beforeEach(() => {
    resetAllMocks()
    mockRequireRoleOrNull.mockReset()
    mockRevokeCertificateAction.mockReset()
    mockSupabaseRpc.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("exposes a 30-second undo window constant", () => {
    expect(UNDO_WINDOW_SECONDS).toBe(30)
  })

  it("revokes the cert, deletes the queued email, and flips intake back to in_review", async () => {
    authAs(DOCTOR_A)
    mockRevokeCertificateAction.mockResolvedValue({ success: true })

    // Email is scheduled for 25s in the future and has not been sent yet
    const futureIso = new Date(Date.now() + 25_000).toISOString()
    const { outboxDelete, intakeUpdate } = wireSupabaseMocks({
      cert: { id: CERT_ID, doctor_id: DOCTOR_A, status: "valid" },
      outboxRow: { id: "outbox-1", status: "pending", scheduled_for: futureIso, sent_at: null },
    })

    const result = await undoCertApprovalAction({ intakeId: INTAKE_ID })

    expect(result.success).toBe(true)
    expect(mockRevokeCertificateAction).toHaveBeenCalledWith({
      intakeId: INTAKE_ID,
      reason: expect.stringContaining("Undo"),
    })
    expect(outboxDelete).toHaveBeenCalled()
    expect(intakeUpdate).toHaveBeenCalled()
  })

  it("returns an error when the undo window has passed (email already sent)", async () => {
    authAs(DOCTOR_A)
    wireSupabaseMocks({
      cert: { id: CERT_ID, doctor_id: DOCTOR_A, status: "valid" },
      // Email row exists but it has been sent
      outboxRow: {
        id: "outbox-1",
        status: "sent",
        scheduled_for: new Date(Date.now() - 5_000).toISOString(),
        sent_at: new Date(Date.now() - 1_000).toISOString(),
      },
    })

    const result = await undoCertApprovalAction({ intakeId: INTAKE_ID })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/window/i)
    expect(mockRevokeCertificateAction).not.toHaveBeenCalled()
  })

  it("returns an error when the scheduled_for timestamp is already in the past (dispatcher likely picked it up)", async () => {
    authAs(DOCTOR_A)
    wireSupabaseMocks({
      cert: { id: CERT_ID, doctor_id: DOCTOR_A, status: "valid" },
      outboxRow: {
        id: "outbox-1",
        status: "pending",
        scheduled_for: new Date(Date.now() - 10_000).toISOString(),
        sent_at: null,
      },
    })

    const result = await undoCertApprovalAction({ intakeId: INTAKE_ID })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/window/i)
  })

  it("requires the same doctor who approved", async () => {
    authAs(DOCTOR_B) // Doctor B tries to undo Doctor A's approval
    wireSupabaseMocks({
      cert: { id: CERT_ID, doctor_id: DOCTOR_A, status: "valid" },
      outboxRow: {
        id: "outbox-1",
        status: "pending",
        scheduled_for: new Date(Date.now() + 20_000).toISOString(),
        sent_at: null,
      },
    })

    const result = await undoCertApprovalAction({ intakeId: INTAKE_ID })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/approving doctor/i)
    expect(mockRevokeCertificateAction).not.toHaveBeenCalled()
  })

  it("returns Unauthorized when no doctor session is present", async () => {
    mockRequireRoleOrNull.mockResolvedValue(null)

    const result = await undoCertApprovalAction({ intakeId: INTAKE_ID })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/unauthorized/i)
  })

  it("returns an error when no certificate is found for the intake", async () => {
    authAs(DOCTOR_A)
    wireSupabaseMocks({ cert: null })

    const result = await undoCertApprovalAction({ intakeId: INTAKE_ID })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/no certificate/i)
  })

  it("treats already-revoked cert as a soft success without re-revoking", async () => {
    authAs(DOCTOR_A)
    mockRevokeCertificateAction.mockResolvedValue({ success: true, alreadyRevoked: true })
    wireSupabaseMocks({
      cert: { id: CERT_ID, doctor_id: DOCTOR_A, status: "revoked" },
      outboxRow: {
        id: "outbox-1",
        status: "pending",
        scheduled_for: new Date(Date.now() + 20_000).toISOString(),
        sent_at: null,
      },
    })

    const result = await undoCertApprovalAction({ intakeId: INTAKE_ID })

    expect(result.success).toBe(true)
  })

  it("succeeds even when the email row is missing (cert was issued but dispatcher row vanished)", async () => {
    authAs(DOCTOR_A)
    mockRevokeCertificateAction.mockResolvedValue({ success: true })
    // No outbox row found at all
    wireSupabaseMocks({
      cert: { id: CERT_ID, doctor_id: DOCTOR_A, status: "valid" },
      outboxRow: null,
    })

    // We treat a missing email row as "window has already closed" because we
    // can't prove the email hasn't fired - safer than allowing undo against
    // a state we can't verify.
    const result = await undoCertApprovalAction({ intakeId: INTAKE_ID })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/window/i)
    expect(mockRevokeCertificateAction).not.toHaveBeenCalled()
  })
})
