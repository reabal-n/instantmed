import { describe, expect, it } from "vitest"

import {
  compareMigrationHistory,
  parseMigrationList,
} from "@/scripts/check-supabase-migration-history.mjs"

describe("supabase migration history contract", () => {
  it("detects remote-only migration drift", () => {
    const rows = parseMigrationList(`
       LOCAL      |     REMOTE     |     TIME (UTC)
      ------------|----------------|---------------------
       20260502000000 | 20260502000000 | 2026-05-02 00:00:00
                    | 20260503050700 | 2026-05-03 05:07:00
    `)

    expect(compareMigrationHistory(rows, ["20260502000000"])).toMatchObject({
      remoteOnly: ["20260503050700"],
      remoteMissingLocalFile: ["20260503050700"],
    })
  })

  it("detects local migration files missing from the linked tracker", () => {
    const rows = parseMigrationList(`
       LOCAL      |     REMOTE     |     TIME (UTC)
      ------------|----------------|---------------------
       20260502000000 | 20260502000000 | 2026-05-02 00:00:00
    `)

    expect(compareMigrationHistory(rows, [
      "20260502000000",
      "20260503000100",
    ])).toMatchObject({
      localFilesMissingFromTracker: ["20260503000100"],
    })
  })

  it("allows a pending local tail before it is applied remotely", () => {
    const rows = parseMigrationList(`
       LOCAL      |     REMOTE     |     TIME (UTC)
      ------------|----------------|---------------------
       20260502000000 | 20260502000000 | 2026-05-02 00:00:00
       20260503000100 |                |
    `)

    expect(
      compareMigrationHistory(rows, ["20260502000000", "20260503000100"]),
    ).toMatchObject({
      pendingLocal: ["20260503000100"],
      localOnlyInTracker: [],
      localFilesMissingFromTracker: [],
    })
  })

  it("still rejects a local history gap before a newer remote migration", () => {
    const rows = parseMigrationList(`
       LOCAL      |     REMOTE     |     TIME (UTC)
      ------------|----------------|---------------------
       20260502000000 | 20260502000000 | 2026-05-02 00:00:00
       20260503000100 |                |
       20260504000000 | 20260504000000 | 2026-05-04 00:00:00
    `)

    expect(
      compareMigrationHistory(rows, [
        "20260502000000",
        "20260503000100",
        "20260504000000",
      ]),
    ).toMatchObject({
      pendingLocal: [],
      localOnlyInTracker: ["20260503000100"],
    })
  })
})
