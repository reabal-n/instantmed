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
})
