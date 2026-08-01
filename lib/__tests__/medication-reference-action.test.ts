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
    expect(source).toContain('.select("name, brand_names")')
    expect(source).toContain('.eq("is_active", true)')
    expect(source).not.toMatch(/\bfetch\s*\(/)
    expect(source).not.toContain("console.")
    expect(source).not.toMatch(/Sentry|PostHog|captureException|captureMessage/)
  })
})
