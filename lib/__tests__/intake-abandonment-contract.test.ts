import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const migrationsDir = path.join(process.cwd(), "supabase/migrations")

describe("intake abandonment tracking contract", () => {
  it("has an active post-baseline migration that restores the intake_abandonment analytics table", () => {
    const restoreMigration = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .filter((file) => file > "20260528003557_add_profile_ihi_number.sql")
      .find((file) => {
        const sql = readFileSync(path.join(migrationsDir, file), "utf8")
        return (
          sql.includes("CREATE TABLE IF NOT EXISTS public.intake_abandonment") &&
          sql.includes("ALTER TABLE public.intake_abandonment ENABLE ROW LEVEL SECURITY") &&
          sql.includes("CREATE POLICY \"intake_abandonment_admin\"")
        )
      })

    expect(restoreMigration).toBeTruthy()
  })
})
