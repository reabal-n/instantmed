import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const vercelConfig = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"))
const crons = Array.isArray(vercelConfig.crons) ? vercelConfig.crons : []

const failures = []
const seen = new Set()

for (const cron of crons) {
  const path = cron?.path
  if (typeof path !== "string" || !path.startsWith("/api/cron/")) {
    failures.push(`Invalid cron path: ${String(path)}`)
    continue
  }

  if (seen.has(path)) {
    failures.push(`Duplicate cron path: ${path}`)
    continue
  }
  seen.add(path)

  const routeFile = join(root, "app", path, "route.ts")
  if (!existsSync(routeFile)) {
    failures.push(`Missing route for scheduled cron: ${path}`)
  }
}

if (failures.length > 0) {
  console.error("Vercel cron route check failed:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Vercel cron route check passed (${crons.length} scheduled jobs).`)
