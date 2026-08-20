/**
 * Doctor-history medicine labels + prior-request context (2026-08-11)
 *
 * Two same-service history rows are indistinguishable without the medicine
 * the patient asked for — production incident: two repeat scripts submitted
 * six minutes apart read as duplicates in the cockpit. These tests pin the
 * ONE shared assembly point (`buildPreviousIntakeContext`) both the
 * review-data route and the intake detail page consume: current-intake
 * exclusion, batched fail-soft medicine labels across current + legacy
 * answer shapes, and the TRUE prior-request total.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildPreviousIntakeContext } from "@/lib/doctor/intake-medication-label"

const fromMock = vi.fn()
const getPatientIntakesMock = vi.fn()

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}))

vi.mock("@/lib/data/intakes", () => ({
  getPatientIntakes: (...args: unknown[]) => getPatientIntakesMock(...args),
}))

function mockAnswersQuery(result: { data?: unknown[]; error?: { message: string } | null }) {
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null }),
    }),
  })
}

function mockPatientIntakes(rows: Array<{ id: string }>, total = rows.length) {
  getPatientIntakesMock.mockResolvedValue({
    data: rows.map((row) => ({ ...row, payment_status: "paid", paid_at: null })),
    total,
    page: 1,
    pageSize: 6,
  })
}

async function labelFor(answers: Record<string, unknown> | null): Promise<string | null> {
  mockPatientIntakes([{ id: "current" }, { id: "probe" }])
  mockAnswersQuery({ data: [{ intake_id: "probe", answers }] })
  const context = await buildPreviousIntakeContext({
    patientId: "patient-1",
    currentIntakeId: "current",
  })
  return context.previousIntakes[0]?.medication_name ?? null
}

beforeEach(() => {
  fromMock.mockReset()
  getPatientIntakesMock.mockReset()
})

describe("medication label extraction (via the shared context builder)", () => {
  it("returns the patient-typed medicine from the current intake shape", async () => {
    expect(await labelFor({ medicationName: "Metformin 500mg" })).toBe("Metformin 500mg")
  })

  it("prefers the display name over the raw name", async () => {
    expect(
      await labelFor({
        medication_display: "Levlen ED",
        medication_name: "levonorgestrel/ethinylestradiol",
      }),
    ).toBe("Levlen ED")
  })

  it("reads legacy snake_case and selected-medication keys", async () => {
    expect(await labelFor({ medication_name: "Sertraline" })).toBe("Sertraline")
    expect(await labelFor({ selected_medication_name: "Propecia" })).toBe("Propecia")
  })

  it("yields no label for missing or blank answers", async () => {
    expect(await labelFor(null)).toBeNull()
    expect(await labelFor({})).toBeNull()
    expect(await labelFor({ medicationName: "   " })).toBeNull()
  })

  it("trims surrounding whitespace", async () => {
    expect(await labelFor({ medicationName: "  Ozempic  " })).toBe("Ozempic")
  })
})

describe("buildPreviousIntakeContext", () => {
  it("excludes the current intake, enriches rows in one batched query, and reports the TRUE total", async () => {
    mockPatientIntakes(
      [
        { id: "current" },
        { id: "p1" },
        { id: "p2" },
        { id: "p3" },
        { id: "p4" },
        { id: "p5" },
      ],
      40,
    )
    mockAnswersQuery({
      data: [{ intake_id: "p1", answers: { medicationName: "Metformin" } }],
    })

    const context = await buildPreviousIntakeContext({
      patientId: "patient-1",
      currentIntakeId: "current",
    })

    expect(context.previousIntakes.map((row) => row.id)).toEqual([
      "p1", "p2", "p3", "p4", "p5",
    ])
    expect(context.previousIntakes[0].medication_name).toBe("Metformin")
    expect(context.previousIntakes[1].medication_name).toBeNull()
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith("intake_answers")
    expect(getPatientIntakesMock).toHaveBeenCalledWith("patient-1", {
      pageSize: 6,
      scope: "clinical_history",
    })
    // 40 clinical-history intakes minus the current one — never the capped
    // page length or an unpaid checkout artifact.
    expect(context.previousIntakeCount).toBe(39)
  })

  it("skips the answers query entirely when the patient has no prior intakes", async () => {
    mockPatientIntakes([{ id: "current" }])
    const context = await buildPreviousIntakeContext({
      patientId: "patient-1",
      currentIntakeId: "current",
    })
    expect(context.previousIntakes).toEqual([])
    expect(context.previousIntakeCount).toBe(0)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it("fails soft to unlabelled rows on an answers query error", async () => {
    mockPatientIntakes([{ id: "current" }, { id: "p1" }])
    mockAnswersQuery({ error: { message: "boom" } })
    const context = await buildPreviousIntakeContext({
      patientId: "patient-1",
      currentIntakeId: "current",
    })
    expect(context.previousIntakes[0].medication_name).toBeNull()
  })

  it("floors the count at the visible rows when the total read fails to zero", async () => {
    mockPatientIntakes([{ id: "current" }, { id: "p1" }], 0)
    mockAnswersQuery({ data: [] })
    const context = await buildPreviousIntakeContext({
      patientId: "patient-1",
      currentIntakeId: "current",
    })
    expect(context.previousIntakeCount).toBe(1)
  })
})
