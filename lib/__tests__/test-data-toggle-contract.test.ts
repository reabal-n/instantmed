import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  filterSeededE2EIntakes,
  SEEDED_E2E_PATIENT_PROFILE_ID,
  shouldIncludeSeededE2EData,
} from "@/lib/data/seeded-e2e-data"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

// Fake the Supabase chainable query object the filter mutates.
type FakeQuery = {
  not(column: string, op: string, value: string): FakeQuery
  __calls: Array<{ column: string; op: string; value: string }>
}

function fakeQuery(): FakeQuery {
  const calls: FakeQuery["__calls"] = []
  const q: FakeQuery = {
    not(column, op, value) {
      calls.push({ column, op, value })
      return q
    },
    __calls: calls,
  }
  return q
}

const EMPTY_ENV = {}

describe("test-data toggle contract", () => {
  it("filters the seeded E2E patient by default when no override is provided", () => {
    const q = fakeQuery()
    filterSeededE2EIntakes(q, EMPTY_ENV)
    expect(q.__calls).toEqual([
      { column: "patient_id", op: "in", value: `(${SEEDED_E2E_PATIENT_PROFILE_ID})` },
    ])
  })

  it("allows seeded data when allowSeeded: true is passed as the first arg", () => {
    const q = fakeQuery()
    filterSeededE2EIntakes(q, { allowSeeded: true })
    // No `.not(...)` call — the filter is bypassed.
    expect(q.__calls).toEqual([])
  })

  it("allows seeded data when allowSeeded: true is passed as the second arg with explicit env", () => {
    const q = fakeQuery()
    filterSeededE2EIntakes(q, EMPTY_ENV, { allowSeeded: true })
    expect(q.__calls).toEqual([])
  })

  it("respects the env-based override (existing PLAYWRIGHT path) independently of options", () => {
    expect(shouldIncludeSeededE2EData({ PLAYWRIGHT: "1" })).toBe(true)
    expect(shouldIncludeSeededE2EData({ NODE_ENV: "test" })).toBe(true)
    expect(shouldIncludeSeededE2EData({ allowSeeded: true })).toBe(true)
    expect(shouldIncludeSeededE2EData(EMPTY_ENV)).toBe(false)
  })

  it("threads allowSeeded through getDoctorQueue options", () => {
    const source = read("lib/data/intakes/queries.ts")
    // Function signature accepts the option.
    expect(source).toMatch(/allowSeeded\?: boolean/)
    expect(source).toMatch(/onlySeeded\?: boolean/)
    expect(source).toContain("const onlySeeded = allowSeeded && options?.onlySeeded === true")
    expect(source).toContain('query.eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)')
    expect(source).toContain('dataQuery.eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)')
    // Both filter call sites in getDoctorQueue forward the option via the
    // shared `allowSeeded` local. (Counting `{ allowSeeded }` is enough —
    // the filter wraps a multi-line query so regex-matching the whole
    // call is brittle.)
    const forwarded = source.match(/\{ allowSeeded \}/g)?.length ?? 0
    expect(forwarded).toBeGreaterThanOrEqual(2)
  })

  it("/dashboard page gates the toggle on admin access and the showTestData query param", () => {
    const source = read("app/dashboard/page.tsx")
    expect(source).toContain("showTestData")
    expect(source).toContain("onlyTestData")
    // Admin-only gate.
    expect(source).toContain("isAdmin && params.showTestData === \"1\"")
    expect(source).toContain('process.env.PLAYWRIGHT === "1"')
    // Toggle button + banner both wired.
    expect(source).toContain("TestDataToggleButton")
    expect(source).toContain("TestDataBanner")
    // The queue fetch receives the allowSeeded flag.
    expect(source).toContain("allowSeeded: showTestData")
    expect(source).toContain("onlySeeded: onlyTestData")
    expect(source).toContain("!onlyTestData ? <SystemHealthPill")
  })

  it("test-data toggle UI preserves the rest of the query string", () => {
    const source = read("components/operator/test-data-banner.tsx")
    // `withTestDataParam` clones the existing params before mutating.
    expect(source).toContain("new URLSearchParams(searchParams)")
    // Hide link removes the param without dropping siblings.
    expect(source).toContain('next.delete("showTestData")')
    expect(source).toContain('next.delete("onlyTestData")')
  })
})
