import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  derivePatientSuccessVerificationState,
  fingerprintPatientIntakeProjection,
  PATIENT_SUCCESS_VERIFICATION_DEADLINE_MS,
  type PatientIntakePollingProjection,
  reconcilePatientIntakePollingSnapshot,
} from "@/lib/patient/intake-status-polling"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  getApiAuth: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: mocks.getApiAuth,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { GET } from "@/app/api/patient/intake-status/route"

const PATIENT_ID = "22222222-2222-4222-8222-222222222222"

function listRequest() {
  return new NextRequest("https://instantmed.example/api/patient/intake-status?scope=list")
}

function singleRequest(intakeId = "intake-1") {
  return new NextRequest(
    `https://instantmed.example/api/patient/intake-status?id=${encodeURIComponent(intakeId)}`,
  )
}

function createStatusQueryMock({
  listData = [],
  listError = null,
  singleData = null,
}: {
  listData?: Array<Record<string, unknown>>
  listError?: { message: string } | null
  singleData?: Record<string, unknown> | null
} = {}) {
  const query = {
    eq: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: listData, error: listError })),
    maybeSingle: vi.fn(async () => ({ data: singleData, error: null })),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
  }
  const supabase = {
    from: vi.fn(() => query),
  }
  return { query, supabase }
}

function findClientFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return findClientFiles(path)
    if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name)) return []
    const source = readFileSync(path, "utf8")
    return /^\s*["']use client["']/.test(source) ? [path] : []
  })
}

describe("patient intake polling projection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApiAuth.mockResolvedValue({
      profile: { id: PATIENT_ID, role: "patient" },
    })
  })

  it("caps success-page payment verification at 90 seconds of wall time", () => {
    expect(PATIENT_SUCCESS_VERIFICATION_DEADLINE_MS).toBe(90_000)
  })

  it("seeds the first successful snapshot silently", () => {
    const current: PatientIntakePollingProjection[] = [{
      id: "intake-1",
      payment_recovery_reason: null,
      status: "checkout_failed",
      updated_at: "2026-07-15T00:00:00.000Z",
    }]

    expect(reconcilePatientIntakePollingSnapshot(null, current)).toEqual({
      changes: [],
      hasStructuralChanges: false,
      snapshot: {
        "intake-1": {
          payment_recovery_reason: null,
          status: "checkout_failed",
        },
      },
    })
  })

  it("flags a later ID addition without fabricating a toastable state change", () => {
    const seeded = reconcilePatientIntakePollingSnapshot(null, [{
      id: "intake-1",
      payment_recovery_reason: null,
      status: "paid",
      updated_at: "2026-07-15T00:00:00.000Z",
    }])

    const added = reconcilePatientIntakePollingSnapshot(seeded.snapshot, [
      {
        id: "intake-2",
        payment_recovery_reason: null,
        status: "pending_payment",
        updated_at: "2026-07-15T00:01:00.000Z",
      },
      {
        id: "intake-1",
        payment_recovery_reason: null,
        status: "paid",
        updated_at: "2026-07-15T00:00:00.000Z",
      },
    ])

    expect(added.hasStructuralChanges).toBe(true)
    expect(added.changes).toEqual([])
  })

  it("flags a later ID removal without fabricating a toastable state change", () => {
    const seeded = reconcilePatientIntakePollingSnapshot(null, [
      {
        id: "intake-2",
        payment_recovery_reason: null,
        status: "pending_payment",
        updated_at: "2026-07-15T00:01:00.000Z",
      },
      {
        id: "intake-1",
        payment_recovery_reason: null,
        status: "paid",
        updated_at: "2026-07-15T00:00:00.000Z",
      },
    ])

    const removed = reconcilePatientIntakePollingSnapshot(seeded.snapshot, [{
      id: "intake-1",
      payment_recovery_reason: null,
      status: "paid",
      updated_at: "2026-07-15T00:00:00.000Z",
    }])

    expect(removed.hasStructuralChanges).toBe(true)
    expect(removed.changes).toEqual([])
  })

  it("adopts fresh paid server props and clears stale verification failures", () => {
    expect(derivePatientSuccessVerificationState(
      {
        isVerifying: true,
        pollingError: true,
        resolvedAmountCents: undefined,
        status: "pending_payment",
        verificationFailed: true,
      },
      { amountCents: 2995, initialStatus: "paid" },
    )).toEqual({
      isVerifying: false,
      pollingError: false,
      resolvedAmountCents: 2995,
      status: "paid",
      verificationFailed: false,
    })
  })

  it("does not let an out-of-order pending observation regress a confirmed payment", () => {
    expect(derivePatientSuccessVerificationState(
      {
        isVerifying: false,
        pollingError: false,
        resolvedAmountCents: 2995,
        status: "paid",
        verificationFailed: false,
      },
      { amountCents: 2995, initialStatus: "pending_payment" },
    )).toEqual({
      isVerifying: false,
      pollingError: false,
      resolvedAmountCents: 2995,
      status: "paid",
      verificationFailed: false,
    })
  })

  it("fingerprints identical projections identically and any row change differently", () => {
    const rows: PatientIntakePollingProjection[] = [
      {
        id: "intake-1",
        payment_recovery_reason: null,
        status: "paid",
        updated_at: "2026-07-15T01:00:00.000Z",
      },
    ]

    expect(fingerprintPatientIntakeProjection(rows)).toBe(
      fingerprintPatientIntakeProjection(rows.map((row) => ({ ...row }))),
    )
    expect(fingerprintPatientIntakeProjection(rows)).not.toBe(
      fingerprintPatientIntakeProjection([{ ...rows[0], status: "approved" }]),
    )
    expect(fingerprintPatientIntakeProjection(rows)).not.toBe(
      fingerprintPatientIntakeProjection([]),
    )
  })

  it("detects a same-status recovery-reason change but ignores updated_at alone", () => {
    const seeded = reconcilePatientIntakePollingSnapshot(null, [{
      id: "intake-1",
      payment_recovery_reason: null,
      status: "checkout_failed",
      updated_at: "2026-07-15T00:00:00.000Z",
    }])

    const timestampOnly = reconcilePatientIntakePollingSnapshot(seeded.snapshot, [{
      id: "intake-1",
      payment_recovery_reason: null,
      status: "checkout_failed",
      updated_at: "2026-07-15T00:01:00.000Z",
    }])
    expect(timestampOnly.changes).toEqual([])

    const held = reconcilePatientIntakePollingSnapshot(timestampOnly.snapshot, [{
      id: "intake-1",
      payment_recovery_reason: "more_information_required",
      status: "checkout_failed",
      updated_at: "2026-07-15T00:02:00.000Z",
    }])

    expect(held.changes).toEqual([{
      current: {
        id: "intake-1",
        payment_recovery_reason: "more_information_required",
        status: "checkout_failed",
        updated_at: "2026-07-15T00:02:00.000Z",
      },
      previous: {
        payment_recovery_reason: null,
        status: "checkout_failed",
      },
    }])
  })

  it("requires an authenticated patient for list polling", async () => {
    mocks.getApiAuth.mockResolvedValue(null)
    const { supabase } = createStatusQueryMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const response = await GET(listRequest())

    expect(response.status).toBe(401)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("returns only the bounded owned patient projection and derives the exact hold reason", async () => {
    const { query, supabase } = createStatusQueryMock({
      listData: [
        {
          checkout_error: "safety_missing_required_information",
          doctor_notes: "must never cross the route",
          id: "intake-held",
          payment_id: "cs_internal",
          status: "checkout_failed",
          updated_at: "2026-07-15T01:00:00.000Z",
        },
        {
          checkout_error: "stripe_session_create_failed",
          id: "intake-ordinary",
          status: "checkout_failed",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const response = await GET(listRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(body).toEqual({
      intakes: [
        {
          id: "intake-held",
          payment_recovery_reason: "more_information_required",
          status: "checkout_failed",
          updated_at: "2026-07-15T01:00:00.000Z",
        },
        {
          id: "intake-ordinary",
          payment_recovery_reason: null,
          status: "checkout_failed",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
      snapshot: expect.any(String),
    })
    expect(JSON.stringify(body)).not.toContain("checkout_error")
    expect(JSON.stringify(body)).not.toContain("payment_id")
    expect(JSON.stringify(body)).not.toContain("doctor_notes")
    expect(query.select).toHaveBeenCalledWith("id, status, updated_at, checkout_error")
    expect(query.eq).toHaveBeenCalledWith("patient_id", PATIENT_ID)
    expect(query.order).toHaveBeenCalledWith("updated_at", { ascending: false })
    expect(query.limit).toHaveBeenCalledWith(100)
    expect(mocks.revalidateTag.mock.calls).toEqual([
      [`patient-dashboard-${PATIENT_ID}`],
      [`patient-intakes-${PATIENT_ID}`],
    ])
  })

  it("skips patient-view invalidation when the echoed snapshot matches the fresh read", async () => {
    const listData = [
      {
        checkout_error: null,
        id: "intake-1",
        status: "approved",
        updated_at: "2026-07-15T01:00:00.000Z",
      },
    ]
    mocks.createServiceRoleClient.mockReturnValue(
      createStatusQueryMock({ listData }).supabase,
    )
    const first = await (await GET(listRequest())).json()
    expect(mocks.revalidateTag).toHaveBeenCalledTimes(2)

    mocks.revalidateTag.mockClear()
    mocks.createServiceRoleClient.mockReturnValue(
      createStatusQueryMock({ listData }).supabase,
    )
    const second = await GET(
      new NextRequest(
        `https://instantmed.example/api/patient/intake-status?scope=list&snapshot=${first.snapshot}`,
      ),
    )

    expect((await second.json()).snapshot).toBe(first.snapshot)
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it("invalidates patient views again once the projection actually changes", async () => {
    const row = {
      checkout_error: null,
      id: "intake-1",
      status: "paid",
      updated_at: "2026-07-15T01:00:00.000Z",
    }
    mocks.createServiceRoleClient.mockReturnValue(
      createStatusQueryMock({ listData: [row] }).supabase,
    )
    const first = await (await GET(listRequest())).json()

    mocks.revalidateTag.mockClear()
    mocks.createServiceRoleClient.mockReturnValue(
      createStatusQueryMock({
        listData: [
          { ...row, status: "approved", updated_at: "2026-07-15T02:00:00.000Z" },
        ],
      }).supabase,
    )
    const second = await GET(
      new NextRequest(
        `https://instantmed.example/api/patient/intake-status?scope=list&snapshot=${first.snapshot}`,
      ),
    )
    const secondBody = await second.json()

    expect(secondBody.snapshot).not.toBe(first.snapshot)
    expect(mocks.revalidateTag.mock.calls).toEqual([
      [`patient-dashboard-${PATIENT_ID}`],
      [`patient-intakes-${PATIENT_ID}`],
    ])
  })

  it("fails closed when the projected list query fails", async () => {
    const { supabase } = createStatusQueryMock({
      listError: { message: "database unavailable" },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const response = await GET(listRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Unable to load request updates" })
  })

  it("preserves the success-page single-intake response without widening it", async () => {
    const { query, supabase } = createStatusQueryMock({
      singleData: {
        amount_cents: 2995,
        is_priority: true,
        payment_status: "paid",
        status: "paid",
      },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const response = await GET(singleRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      amount_cents: 2995,
      is_priority: true,
      payment_status: "paid",
      status: "paid",
    })
    expect(query.select).toHaveBeenCalledWith(
      "status, payment_status, amount_cents, is_priority",
    )
    expect(query.eq).toHaveBeenCalledWith("patient_id", PATIENT_ID)
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })
})

describe("patient browser status transport source contract", () => {
  const root = process.cwd()
  const clientFiles = [
    ...findClientFiles(join(root, "app/patient")),
    ...findClientFiles(join(root, "components/patient")),
  ]
  const pollerSource = readFileSync(
    join(root, "components/patient/intake-status-listener.tsx"),
    "utf8",
  )
  const globalSource = readFileSync(
    join(root, "components/patient/global-intake-notifications.tsx"),
    "utf8",
  )
  const trackerSource = readFileSync(
    join(root, "components/patient/intake-status-tracker.tsx"),
    "utf8",
  )
  const successClientSource = readFileSync(
    join(root, "app/patient/intakes/success/success-client.tsx"),
    "utf8",
  )

  it("contains no authenticated patient client that subscribes to or queries intake rows directly", () => {
    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8")
      expect(source, file).not.toContain("postgres_changes")
      expect(source, file).not.toMatch(/\.from\(["']intakes["']\)/)
      expect(source, file).not.toMatch(/\.from\(["']intake_status_history["']\)/)
    }
  })

  it("keeps one visibility-aware, abortable poll owner without browser-supplied ownership", () => {
    expect(pollerSource).toContain('/api/patient/intake-status?scope=list')
    expect(pollerSource).toContain("AbortController")
    expect(pollerSource).toContain('document.addEventListener("visibilitychange"')
    expect(pollerSource).toContain('window.addEventListener("focus"')
    expect(pollerSource).toContain("document.hidden")
    expect(pollerSource).toContain("clearInterval")
    expect(pollerSource).toContain("reconciled.hasStructuralChanges")
    expect(pollerSource).not.toContain("patientId")
    expect(globalSource).not.toContain("patientId")
    expect(trackerSource).toContain("const status = initialStatus")
    expect(trackerSource).not.toContain("new Date()")
    expect(successClientSource).toContain("derivePatientSuccessVerificationState")
    expect(successClientSource).toContain("setVerificationState((current)")
    expect(successClientSource).not.toContain("setStatus(initialStatus)")
  })

  it("keeps exact success-page verification single-flight and cleanup-safe", () => {
    expect(successClientSource).toContain("let disposed = false")
    expect(successClientSource).toContain(
      "let activeController: AbortController | null = null",
    )
    expect(successClientSource).toContain(
      "if (disposed || activeController) return false",
    )
    expect(successClientSource).toMatch(
      /fetch\(`\/api\/patient\/intake-status\?id=\$\{intakeId\}`,[\s\S]*?signal: controller\.signal/,
    )
    expect(successClientSource).toMatch(
      /fetch\("\/api\/stripe\/verify-payment",[\s\S]*?signal: controller\.signal/,
    )
    expect(
      successClientSource.match(
        /if \(disposed \|\| controller\.signal\.aborted\) return false/g,
      ),
    ).toHaveLength(4)
    expect(successClientSource).toContain(
      'error instanceof DOMException && error.name === "AbortError"',
    )
    expect(successClientSource).toContain("disposed = true")
    expect(successClientSource).toContain("activeController?.abort()")
  })

  it("ends exact success-page verification once at an independent deadline", () => {
    expect(successClientSource).toContain(
      "PATIENT_SUCCESS_VERIFICATION_DEADLINE_MS",
    )
    expect(successClientSource).toContain("let verificationFinished = false")
    expect(successClientSource).toContain(
      "let deadlineId: ReturnType<typeof setTimeout> | null = null",
    )
    expect(successClientSource).toMatch(
      /deadlineId = setTimeout\(\(\) => \{[\s\S]*?finishWithVerificationTimeout\(\)[\s\S]*?PATIENT_SUCCESS_VERIFICATION_DEADLINE_MS/,
    )
    expect(successClientSource).toContain("if (verificationFinished) return false")
    expect(successClientSource).toContain("clearTimeout(deadlineId)")
    expect(
      successClientSource.match(
        /if \(!finishVerification\(\)\) return true/g,
      ),
    ).toHaveLength(2)
    expect(
      successClientSource.match(/payment_verification_timeout/g),
    ).toHaveLength(1)
    expect(
      successClientSource.match(/verificationFailed: true/g),
    ).toHaveLength(1)
    expect(successClientSource).toMatch(
      /return \(\) => \{[\s\S]*?disposed = true[\s\S]*?verificationFinished = true[\s\S]*?clearVerificationTimers\(\)[\s\S]*?activeController\?\.abort\(\)/,
    )
  })
})
