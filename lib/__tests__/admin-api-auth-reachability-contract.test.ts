import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

/**
 * Middleware protects `/^\/api\/admin/` and returns 401 before any route in
 * that tree runs, so a `CRON_SECRET` bearer can never reach one of these
 * handlers. A bearer-auth branch under `/api/admin/` is therefore dead code
 * that reads as a working terminal entry point and silently is not one.
 *
 * This was shipped once (the stranded-checkout recovery route) and only
 * surfaced when a live dry run against production returned middleware's 401.
 * Privileged automation that genuinely needs bearer auth belongs outside the
 * `/api/admin/` tree.
 */
function collectRouteFiles(dir: string): string[] {
  let found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      found = found.concat(collectRouteFiles(full))
    } else if (entry === "route.ts" || entry === "route.tsx") {
      found.push(full)
    }
  }
  return found
}

describe("admin API auth reachability contract", () => {
  const adminApiRoot = join(root, "app/api/admin")
  const routeFiles = collectRouteFiles(adminApiRoot)

  it("finds admin API routes to check", () => {
    expect(routeFiles.length).toBeGreaterThan(0)
  })

  it("keeps middleware's session gate on the admin API tree", () => {
    const middleware = readFileSync(join(root, "middleware.ts"), "utf8")
    // If this pattern ever leaves PROTECTED_PATTERNS, the reasoning below
    // no longer holds and this contract should be revisited deliberately.
    expect(middleware).toContain("/^\\/api\\/admin/")
  })

  it("never uses cron-secret auth under /api/admin, which middleware makes unreachable", () => {
    const offenders = routeFiles.filter((file) => {
      const source = readFileSync(file, "utf8")
      return source.includes("verifyCronRequest") || source.includes("withCronAuth")
    })

    expect(
      offenders.map((file) => file.replace(`${root}/`, "")),
      "cron-secret auth under /api/admin is dead code: middleware 401s the request before the handler runs. Move the route out of /api/admin, or use an admin session.",
    ).toEqual([])
  })
})
