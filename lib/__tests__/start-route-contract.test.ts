import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("legacy start route contract", () => {
  it("does not classify /start as a gone ghost URL while the route redirects into /request", () => {
    const middleware = readFileSync(join(process.cwd(), "middleware.ts"), "utf8")
    const startRoute = readFileSync(join(process.cwd(), "app/start/page.tsx"), "utf8")

    const ghostPathsBlock = middleware.match(/const ghostPaths = \[([\s\S]*?)\]/)?.[1] ?? ""

    expect(ghostPathsBlock).not.toContain('"/start"')
    expect(startRoute).toContain('redirect(targetUrl)')
    expect(startRoute).toContain('"repeat-rx": "prescription"')
  })
})
