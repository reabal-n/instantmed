import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import {
  isSupersededDuplicateCheckoutError,
  resolvePaymentRecoveryCanonicality,
} from "@/lib/stripe/canonical-payment-recovery"

interface FakeQueryState {
  filters: Array<{ column: string; method: string; value: unknown }>
  table: string
}

function createCanonicalityClient({
  guestCandidate,
  patientCandidate,
  profileError = null,
}: {
  guestCandidate: { created_at: string; id: string } | null
  patientCandidate: { created_at: string; id: string } | null
  profileError?: { message: string } | null
}) {
  const queries: FakeQueryState[] = []

  const client = {
    from: vi.fn((table: string) => {
      const state: FakeQueryState = { filters: [], table }
      queries.push(state)

      const builder = {
        eq: vi.fn((column: string, value: unknown) => {
          state.filters.push({ column, method: "eq", value })
          return builder
        }),
        in: vi.fn((column: string, value: unknown) => {
          state.filters.push({ column, method: "in", value })
          return builder
        }),
        is: vi.fn((column: string, value: unknown) => {
          state.filters.push({ column, method: "is", value })
          return builder
        }),
        limit: vi.fn(() => builder),
        or: vi.fn(() => builder),
        order: vi.fn(() => builder),
        select: vi.fn(() => builder),
        then: (
          resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => {
          let result: { data: unknown[] | null; error: { message: string } | null }
          if (table === "profiles") {
            result = profileError
              ? { data: null, error: profileError }
              : { data: [{ id: "patient-1" }, { id: "patient-2" }], error: null }
          } else if (state.filters.some((filter) => filter.column === "guest_email")) {
            result = { data: guestCandidate ? [guestCandidate] : [], error: null }
          } else {
            result = { data: patientCandidate ? [patientCandidate] : [], error: null }
          }
          return Promise.resolve(result).then(resolve, reject)
        },
      }

      return builder
    }),
  }

  return { client: client as unknown as SupabaseClient, queries }
}

describe("canonical payment recovery", () => {
  it("recognises the audit marker without discarding the original checkout error", () => {
    expect(isSupersededDuplicateCheckoutError("superseded_duplicate_unpaid")).toBe(true)
    expect(
      isSupersededDuplicateCheckoutError(
        "Card declined | superseded_duplicate_unpaid",
      ),
    ).toBe(true)
    expect(isSupersededDuplicateCheckoutError("Card declined")).toBe(false)
  })

  it("finds a newer guest request across guest and signed-in profile rows", async () => {
    const { client, queries } = createCanonicalityClient({
      guestCandidate: {
        created_at: "2026-07-14T21:30:00.000Z",
        id: "intake-newer",
      },
      patientCandidate: {
        created_at: "2026-07-14T08:14:00.000Z",
        id: "intake-older",
      },
    })

    const result = await resolvePaymentRecoveryCanonicality(client, {
      category: "prescription",
      createdAt: "2026-07-14T08:14:00.000Z",
      email: " Patient@Example.com ",
      id: "intake-older",
      patientId: "patient-1",
      subtype: "repeat",
    })

    expect(result).toEqual({
      canonicalIntakeId: "intake-newer",
      kind: "superseded",
    })
    expect(queries.find((query) => query.table === "profiles")?.filters).toContainEqual({
      column: "normalized_email",
      method: "eq",
      value: "patient@example.com",
    })
    expect(
      queries.find((query) =>
        query.filters.some((filter) => filter.column === "patient_id"),
      )?.filters,
    ).toContainEqual({
      column: "patient_id",
      method: "in",
      value: ["patient-1", "patient-2"],
    })
  })

  it("breaks equal timestamp ties deterministically by id", async () => {
    const { client } = createCanonicalityClient({
      guestCandidate: {
        created_at: "2026-07-14T21:30:00.000Z",
        id: "intake-a",
      },
      patientCandidate: {
        created_at: "2026-07-14T21:30:00.000Z",
        id: "intake-b",
      },
    })

    await expect(
      resolvePaymentRecoveryCanonicality(client, {
        category: "prescription",
        createdAt: "2026-07-14T08:14:00.000Z",
        email: "patient@example.com",
        id: "intake-older",
        patientId: "patient-1",
        subtype: "repeat",
      }),
    ).resolves.toEqual({
      canonicalIntakeId: "intake-b",
      kind: "superseded",
    })
  })

  it("fails closed when the cross-profile identity lookup cannot be confirmed", async () => {
    const { client } = createCanonicalityClient({
      guestCandidate: null,
      patientCandidate: null,
      profileError: { message: "database unavailable" },
    })

    await expect(
      resolvePaymentRecoveryCanonicality(client, {
        category: "prescription",
        createdAt: "2026-07-14T08:14:00.000Z",
        email: "patient@example.com",
        id: "intake-older",
        patientId: "patient-1",
        subtype: "repeat",
      }),
    ).resolves.toEqual({ kind: "unresolved" })
  })
})
