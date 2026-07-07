#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const PLACEHOLDER_HOST = /(^|\.)(example\.(com|org|net)|test\.(com|test)|your-domain\b|changeme\b|placeholder\b|todo\b)/i
const URLISH_KEY = /(^|_)(APP_URL|SITE_URL|URL|URI|HOST|ORIGIN|ENDPOINT)$/i
const NON_WEB_URL_KEY = /(^|_)(DATABASE|POSTGRES|POSTGRESQL|REDIS|MYSQL|MONGO|SMTP|AMQP|RABBITMQ|KAFKA|DSN)(_|$)/i
const DEFAULT_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.preview",
  ".env.vercel.preview",
  ".env.vercel.production",
]

const args = new Set(process.argv.slice(2))
const includeExamples = args.has("--include-example")
const files = includeExamples ? [...DEFAULT_ENV_FILES, ".env.example"] : DEFAULT_ENV_FILES

function isPlaceholderUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) return false
  let url
  try {
    url = new URL(trimmed)
  } catch {
    return true
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return true
  return PLACEHOLDER_HOST.test(url.hostname)
}

function shouldCheckKey(key) {
  return URLISH_KEY.test(key) && !NON_WEB_URL_KEY.test(key)
}

function parseEnvLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) return null
  const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed)
  if (!match) return null

  let value = match[2].trim()
  const quote = value[0]
  if ((quote === `"` || quote === `'`) && value.endsWith(quote)) {
    value = value.slice(1, -1)
  }

  return { key: match[1], value }
}

function addViolation(violations, source, key, lineNumber) {
  violations.push({ source, key, lineNumber })
}

const violations = []

for (const [key, value] of Object.entries(process.env)) {
  if (shouldCheckKey(key) && value && isPlaceholderUrl(value)) {
    addViolation(violations, "process.env", key, null)
  }
}

for (const file of files) {
  const path = join(ROOT, file)
  if (!existsSync(path)) continue

  const lines = readFileSync(path, "utf8").split(/\r?\n/)
  lines.forEach((line, index) => {
    const parsed = parseEnvLine(line)
    if (!parsed) return
    if (shouldCheckKey(parsed.key) && isPlaceholderUrl(parsed.value)) {
      addViolation(violations, basename(file), parsed.key, index + 1)
    }
  })
}

if (violations.length > 0) {
  console.error("Placeholder or invalid URL-like env values detected.")
  console.error("Replace these with real absolute http(s) URLs or leave them unset to use code defaults.")
  console.error("Values are intentionally omitted from this report.")
  for (const violation of violations) {
    const location = violation.lineNumber ? `${violation.source}:${violation.lineNumber}` : violation.source
    console.error(`- ${location} ${violation.key}`)
  }
  process.exit(1)
}

console.log("No placeholder URL-like env values detected.")
