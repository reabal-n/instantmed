#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const VERSION_RE = /^\d{14}$/

export function parseMigrationList(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("|"))
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter(([local, remote]) => VERSION_RE.test(local) || VERSION_RE.test(remote))
    .map(([local, remote]) => ({
      local: VERSION_RE.test(local) ? local : "",
      remote: VERSION_RE.test(remote) ? remote : "",
    }))
}

export function listLocalMigrationVersions(migrationsDir) {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.slice(0, 14))
    .filter((version) => VERSION_RE.test(version))
    .sort()
}

export function compareMigrationHistory(rows, localVersions) {
  const listedLocal = new Set(rows.map((row) => row.local).filter(Boolean))
  const listedRemote = new Set(rows.map((row) => row.remote).filter(Boolean))

  return {
    remoteOnly: rows.filter((row) => !row.local && row.remote).map((row) => row.remote),
    localOnlyInTracker: rows.filter((row) => row.local && !row.remote).map((row) => row.local),
    localFilesMissingFromTracker: localVersions.filter((version) => !listedLocal.has(version)),
    remoteMissingLocalFile: [...listedRemote].filter((version) => !localVersions.includes(version)),
  }
}

function main() {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
  const migrationsDir = join(repoRoot, "supabase", "migrations")
  const output = execFileSync("supabase", ["migration", "list", "--linked"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })

  const drift = compareMigrationHistory(parseMigrationList(output), listLocalMigrationVersions(migrationsDir))
  const problems = Object.entries(drift).filter(([, versions]) => versions.length > 0)

  if (problems.length > 0) {
    console.error("Supabase migration drift detected:")
    for (const [kind, versions] of problems) {
      console.error(`- ${kind}: ${versions.join(", ")}`)
    }
    process.exit(1)
  }

  console.log("Supabase migration history is aligned.")
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
