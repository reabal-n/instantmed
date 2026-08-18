import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  requireRoleOrNull: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { resolveGenericMedicationNameAction } from "@/app/actions/medication-reference"

function medicationCatalogClient(result: { data: unknown; error: unknown }) {
  const eq = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  return {
    client: { from },
    eq,
    from,
    select,
  }
}

function medicationHistoryClient(input: {
  catalog: { data: unknown; error: unknown }
  intake: { data: unknown; error: unknown }
  prescriptions: { data: unknown; error: unknown }
}) {
  const medicationEq = vi.fn().mockResolvedValue(input.catalog)
  const medicationSelect = vi.fn(() => ({ eq: medicationEq }))

  const intakeMaybeSingle = vi.fn().mockResolvedValue(input.intake)
  const intakeEq = vi.fn(() => ({ maybeSingle: intakeMaybeSingle }))
  const intakeSelect = vi.fn(() => ({ eq: intakeEq }))

  const prescriptionLimit = vi.fn().mockResolvedValue(input.prescriptions)
  const prescriptionOrder = vi.fn(() => ({ limit: prescriptionLimit }))
  const prescriptionIn = vi.fn(() => ({ order: prescriptionOrder }))
  const prescriptionEq = vi.fn(() => ({ in: prescriptionIn }))
  const prescriptionSelect = vi.fn(() => ({ eq: prescriptionEq }))

  const from = vi.fn((table: string) => {
    if (table === "medications") return { select: medicationSelect }
    if (table === "intakes") return { select: intakeSelect }
    if (table === "prescriptions") return { select: prescriptionSelect }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: { from },
    from,
    intakeEq,
    intakeMaybeSingle,
    prescriptionEq,
    prescriptionIn,
    prescriptionOrder,
    prescriptionLimit,
  }
}

describe("resolveGenericMedicationNameAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleOrNull.mockResolvedValue({ id: "doctor-1", role: "doctor" })
  })

  it("requires an authenticated doctor or admin before accessing the catalog", async () => {
    mocks.requireRoleOrNull.mockResolvedValue(null)

    await expect(resolveGenericMedicationNameAction("Zoloft 100 mg")).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    })
    expect(mocks.requireRoleOrNull).toHaveBeenCalledWith(["doctor", "admin"])
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("rejects invalid input before accessing the service-role client", async () => {
    await expect(resolveGenericMedicationNameAction("x")).resolves.toEqual({
      success: false,
      error: "Medication reference is invalid",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("fetches active first-party catalog rows and resolves locally", async () => {
    const catalog = medicationCatalogClient({
      data: [
        { name: "Sertraline", brand_names: ["Zoloft"] },
        { name: "Venlafaxine", brand_names: ["Efexor", "Effexor"] },
      ],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(catalog.client)

    await expect(resolveGenericMedicationNameAction("Effexor 75 mg XR capsule")).resolves.toEqual({
      success: true,
      data: {
        status: "resolved",
        genericName: "Venlafaxine",
      },
    })
    expect(catalog.from).toHaveBeenCalledWith("medications")
    expect(catalog.select).toHaveBeenCalledWith("name, brand_names")
    expect(catalog.eq).toHaveBeenCalledWith("is_active", true)
  })

  it("returns no generic name for ambiguous or unsafe catalog matches", async () => {
    const ambiguousCatalog = medicationCatalogClient({
      data: [
        { name: "Ingredient one", brand_names: ["Shared Brand"] },
        { name: "Ingredient two", brand_names: ["Shared Brand"] },
      ],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValueOnce(ambiguousCatalog.client)

    await expect(resolveGenericMedicationNameAction("Shared Brand")).resolves.toEqual({
      success: true,
      data: { status: "ambiguous" },
    })

    const unsafeCatalog = medicationCatalogClient({
      data: [{ name: "Sertraline 100 mg", brand_names: ["Unsafe Brand"] }],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValueOnce(unsafeCatalog.client)

    await expect(resolveGenericMedicationNameAction("Unsafe Brand")).resolves.toEqual({
      success: true,
      data: { status: "unsafe" },
    })
  })

  it("returns no generic name when the curated catalog has no exact match", async () => {
    const catalog = medicationCatalogClient({
      data: [{ name: "Rosuvastatin", brand_names: ["Crestor"] }],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(catalog.client)

    await expect(resolveGenericMedicationNameAction("Crest")).resolves.toEqual({
      success: true,
      data: { status: "unresolved" },
    })
  })

  it("resolves a likely typo only through the same patient's prior prescriptions", async () => {
    const history = medicationHistoryClient({
      catalog: {
        data: [
          { name: "Sertraline", brand_names: ["Zoloft"] },
          { name: "Venlafaxine", brand_names: ["Efexor"] },
        ],
        error: null,
      },
      intake: {
        data: { patient_id: "patient-1" },
        error: null,
      },
      prescriptions: {
        data: [
          { medication_name: "Sertraline" },
          { medication_name: "Venlafaxine" },
        ],
        error: null,
      },
    })
    mocks.createServiceRoleClient.mockReturnValue(history.client)

    await expect(resolveGenericMedicationNameAction(
      "Sertralne 100 mg tablet",
      "00000000-0000-0000-0000-000000000123",
    )).resolves.toEqual({
      success: true,
      data: {
        status: "resolved",
        genericName: "Sertraline",
        source: "previous_prescription",
        matchKind: "likely_typo",
      },
    })

    expect(history.from).toHaveBeenNthCalledWith(1, "medications")
    expect(history.from).toHaveBeenNthCalledWith(2, "intakes")
    expect(history.from).toHaveBeenNthCalledWith(3, "prescriptions")
    expect(history.intakeEq).toHaveBeenCalledWith(
      "id",
      "00000000-0000-0000-0000-000000000123",
    )
    expect(history.prescriptionEq).toHaveBeenCalledWith("patient_id", "patient-1")
    expect(history.prescriptionIn).toHaveBeenCalledWith("status", [
      "active",
      "completed",
      "expired",
    ])
    expect(history.prescriptionOrder).toHaveBeenCalledWith("created_at", { ascending: false })
    expect(history.prescriptionLimit).toHaveBeenCalledWith(20)
  })

  it("fails closed when a supplied intake id is invalid", async () => {
    await expect(resolveGenericMedicationNameAction(
      "Sertraline",
      "not-an-intake-id",
    )).resolves.toEqual({
      success: false,
      error: "Medication reference is invalid",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("fails closed without logging or returning database errors", async () => {
    const catalog = medicationCatalogClient({
      data: null,
      error: { message: "sensitive database detail" },
    })
    mocks.createServiceRoleClient.mockReturnValue(catalog.client)

    await expect(resolveGenericMedicationNameAction("Zoloft")).resolves.toEqual({
      success: false,
      error: "Medication reference unavailable",
    })
  })

  it("contains no external lookup or patient-text logging path", () => {
    const source = readFileSync(
      join(process.cwd(), "app/actions/medication-reference.ts"),
      "utf8",
    )

    expect(source).toContain('.from("medications")')
    expect(source).toContain('.from("prescriptions")')
    expect(source).toContain('.select("name, brand_names")')
    expect(source).toContain('.eq("is_active", true)')
    expect(source).not.toMatch(/\bfetch\s*\(/)
    expect(source).not.toContain("console.")
    expect(source).not.toMatch(/Sentry|PostHog|captureException|captureMessage/)
  })
})
