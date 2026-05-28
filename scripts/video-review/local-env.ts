import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const LOCAL_ENV_FILES = [".env.local", ".env"] as const

export function getEnv(name: string): string | undefined {
  const existing = process.env[name]?.trim()
  if (existing) return existing

  const local = readLocalEnvValue(name)
  if (!local) return undefined

  process.env[name] = local
  return local
}

export function hydrateLocalEnv(names: string[]): void {
  for (const name of names) {
    getEnv(name)
  }
}

export function readLocalEnvValue(name: string, cwd = process.cwd()): string | undefined {
  for (const fileName of LOCAL_ENV_FILES) {
    const value = readEnvFileValue(join(cwd, fileName), name)
    if (value) return value
  }
  return undefined
}

export function readEnvFileValue(path: string, name: string): string | undefined {
  if (!existsSync(path)) return undefined

  const source = readFileSync(path, "utf8")
  const match = source.match(new RegExp(`^${escapeRegExp(name)}\\s*=\\s*(.*)$`, "m"))
  if (!match) return undefined

  const value = parseEnvValue(match[1] ?? "")
  return value.trim() ? value : undefined
}

export function parseEnvValue(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""

  const quote = trimmed[0]
  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }

  const hashIndex = trimmed.indexOf(" #")
  return hashIndex >= 0 ? trimmed.slice(0, hashIndex).trim() : trimmed
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
