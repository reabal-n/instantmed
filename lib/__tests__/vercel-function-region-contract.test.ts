import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const vercelConfig = JSON.parse(
  readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
) as { regions?: string[] }

describe("Vercel function region contract", () => {
  it("co-locates functions with the Sydney Supabase project", () => {
    expect(vercelConfig.regions).toEqual(["syd1"])
  })
})
