/**
 * Doctor-history medicine labels (2026-08-11)
 *
 * Two same-service history rows are indistinguishable without the medicine
 * the patient asked for — production incident: two repeat scripts submitted
 * six minutes apart read as duplicates in the cockpit. These tests pin the
 * batched, fail-soft lookup the review-data route uses, including the label
 * extraction across current + legacy answer shapes (exercised through the
 * public surface — the extractor itself is module-private).
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { getIntakeMedicationLabels } from "@/lib/doctor/intake-medication-label"

const fromMock = vi.fn()

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}))

function mockAnswersQuery(result: { data?: unknown[]; error?: { message: string } | null }) {
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null }),
    }),
  })
}

async function labelFor(answers: Record<string, unknown> | null): Promise<string | undefined> {
  mockAnswersQuery({ data: [{ intake_id: "probe", answers }] })
  const labels = await getIntakeMedicationLabels(["probe"])
  return labels.get("probe")
}

beforeEach(() => {
  fromMock.mockReset()
})

describe("medication label extraction (via the batched lookup)", () => {
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
    expect(await labelFor(null)).toBeUndefined()
    expect(await labelFor({})).toBeUndefined()
    expect(await labelFor({ medicationName: "   " })).toBeUndefined()
  })

  it("trims surrounding whitespace", async () => {
    expect(await labelFor({ medicationName: "  Ozempic  " })).toBe("Ozempic")
  })
})

describe("getIntakeMedicationLabels", () => {
  it("returns a map keyed by intake id from one batched query", async () => {
    mockAnswersQuery({
      data: [
        { intake_id: "a", answers: { medicationName: "Metformin" } },
        { intake_id: "b", answers: { medicationName: "Sertraline" } },
        { intake_id: "c", answers: {} },
      ],
    })
    const labels = await getIntakeMedicationLabels(["a", "b", "c"])
    expect(labels.get("a")).toBe("Metformin")
    expect(labels.get("b")).toBe("Sertraline")
    expect(labels.has("c")).toBe(false)
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith("intake_answers")
  })

  it("skips the query entirely for an empty id list", async () => {
    const labels = await getIntakeMedicationLabels([])
    expect(labels.size).toBe(0)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it("fails soft to an empty map on a query error", async () => {
    mockAnswersQuery({ error: { message: "boom" } })
    const labels = await getIntakeMedicationLabels(["a"])
    expect(labels.size).toBe(0)
  })
})
