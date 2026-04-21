/**
 * Voice guard — build-breaking scan for brand voice violations.
 *
 * Scans these surfaces for banned phrases and em-dashes:
 *   - components/marketing/**
 *   - lib/marketing/**
 *   - app/** (public marketing routes only — internal portals excluded)
 *
 * What is scanned:
 *   1. Banned phrases (see BANNED_PHRASES in lib/marketing/voice.ts)
 *   2. Em-dash characters (U+2014) — banned globally per brand rules.
 *   3. Literal `\u2014` escape sequences — these render as em-dashes too.
 *
 * To add or remove a banned phrase, edit `BANNED_PHRASES` in
 * `lib/marketing/voice.ts`. Do not edit this test to work around a failure.
 *
 * Implementation note: uses Node built-ins only (fs + path) so the test
 * does not add any dependency surface to the repo.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { BANNED_PHRASES, EM_DASH } from '@/lib/marketing/voice'

const ROOT = path.resolve(__dirname, '../..')

const SCAN_DIRS = [
  path.join(ROOT, 'components/marketing'),
  path.join(ROOT, 'lib/marketing'),
  path.join(ROOT, 'app'),
]

/** Extensions to scan. */
const EXTENSIONS = new Set(['.ts', '.tsx'])

/** Files the scanner must not police (they are the policy, not the surface). */
const EXCLUDE_RELATIVE = new Set<string>([
  'lib/marketing/voice.ts',
  'lib/__tests__/voice-guard.test.ts',
])

/**
 * Path segments anywhere in the app/ tree that mean "internal surface"
 * (operator portals, API routes, server actions, auth plumbing, dev tools).
 * These are never seen by patients or crawlers, so voice rules do not apply.
 * Marketing lives outside these subtrees.
 */
const EXCLUDE_APP_SEGMENTS = new Set<string>([
  'admin',
  'doctor',
  'dashboard',
  'patient',
  'api',
  'actions',
  'auth',
  'login',
  'account',
  'email-preferences',
  'intent',
  '(dev)',
])

function isExcludedAppPath(relative: string): boolean {
  if (!relative.startsWith('app' + path.sep) && relative !== 'app') return false
  const segments = relative.split(path.sep)
  // segments[0] === 'app'; check every segment below it.
  for (let i = 1; i < segments.length; i++) {
    if (EXCLUDE_APP_SEGMENTS.has(segments[i])) return true
  }
  return false
}

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return acc
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = path.join(dir, entry)
    const st = statSync(full)

    if (st.isDirectory()) {
      walk(full, acc)
      continue
    }

    if (!st.isFile()) continue
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue
    if (!EXTENSIONS.has(path.extname(entry))) continue

    const relative = path.relative(ROOT, full)
    if (EXCLUDE_RELATIVE.has(relative)) continue
    if (isExcludedAppPath(relative)) continue

    acc.push(full)
  }

  return acc
}

function collectFiles(): string[] {
  return SCAN_DIRS.flatMap(d => walk(d))
}

/**
 * Strip TS/TSX block and line comments so explanations of banned phrases
 * inside comments don't fail the scan. String literals stay intact — strings
 * are the point of the scan.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('voice guard — marketing surfaces', () => {
  const files = collectFiles()

  it('finds at least one marketing file to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('contains no banned phrases', () => {
    const hits: Array<{ file: string; phrase: string; line: number; snippet: string }> = []

    for (const file of files) {
      const raw = readFileSync(file, 'utf8')
      const scrubbed = stripComments(raw)
      const lines = scrubbed.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase()
        for (const phrase of BANNED_PHRASES) {
          if (lower.includes(phrase.toLowerCase())) {
            hits.push({
              file: path.relative(ROOT, file),
              phrase,
              line: i + 1,
              snippet: lines[i].trim().slice(0, 120),
            })
          }
        }
      }
    }

    if (hits.length > 0) {
      const report = hits
        .map(h => `  ${h.file}:${h.line}  [${h.phrase}]  ${h.snippet}`)
        .join('\n')
      throw new Error(
        `Voice guard failed: banned phrases found in ${hits.length} place(s).\n${report}\n\n` +
          `Edit the offending line or update BANNED_PHRASES in lib/marketing/voice.ts (with a reason).`,
      )
    }

    expect(hits).toEqual([])
  })

  it('contains no em-dashes (U+2014)', () => {
    const hits: Array<{ file: string; line: number; snippet: string }> = []

    for (const file of files) {
      const raw = readFileSync(file, 'utf8')
      const scrubbed = stripComments(raw)
      const lines = scrubbed.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(EM_DASH)) {
          hits.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            snippet: lines[i].trim().slice(0, 120),
          })
        }
      }
    }

    if (hits.length > 0) {
      const report = hits
        .map(h => `  ${h.file}:${h.line}  ${h.snippet}`)
        .join('\n')
      throw new Error(
        `Voice guard failed: em-dash (U+2014) found in ${hits.length} place(s). ` +
          `Use commas, periods, colons, or parens instead.\n${report}`,
      )
    }

    expect(hits).toEqual([])
  })

  // An em-dash written as the JS escape `\u2014` is still an em-dash at render
  // time. Catch those too so authors can't sidestep the literal-character scan.
  it('contains no em-dash escape sequences (\\u2014)', () => {
    const hits: Array<{ file: string; line: number; snippet: string }> = []
    const ESCAPE = '\\u2014'

    for (const file of files) {
      const raw = readFileSync(file, 'utf8')
      const scrubbed = stripComments(raw)
      const lines = scrubbed.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(ESCAPE)) {
          hits.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            snippet: lines[i].trim().slice(0, 120),
          })
        }
      }
    }

    if (hits.length > 0) {
      const report = hits
        .map(h => `  ${h.file}:${h.line}  ${h.snippet}`)
        .join('\n')
      throw new Error(
        `Voice guard failed: em-dash escape sequence (\\u2014) found in ${hits.length} place(s). ` +
          `Replace with commas, periods, colons, or parens.\n${report}`,
      )
    }

    expect(hits).toEqual([])
  })
})
