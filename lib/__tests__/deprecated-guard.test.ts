/**
 * Deprecated guard, build-breaking scan for undated @deprecated tags.
 *
 * A file can mark an export `@deprecated` while we transition callers off of
 * it. But an indefinite `@deprecated` silently rots: nobody remembers why it
 * was tagged, and the dead surface stays in the bundle forever. We learned
 * this the expensive way on `FloatingCard.direction`, `MagneticButton.strength`,
 * and `AnimatedNavLink.gradient`, all tagged months apart, all quietly kept
 * shipping dead props until a cleanup pass removed them.
 *
 * The rule: every `@deprecated` tag must be paired with a `FIXME(YYYY-MM-DD)`
 * within 3 lines, naming the date the tag should be removed by. If the FIXME
 * is missing, or the date has passed, this test fails the build.
 *
 * Scope: the whole repo minus node_modules, .next, build, test files, and
 * this file itself. Rationale: unlike voice rules, deprecation discipline
 * applies to clinical/portal code too, not just marketing.
 *
 * How to silence a legitimate failure:
 *   1. Add a FIXME to the same JSDoc block:
 *      // FIXME(2026-07-15): remove after intake v3 ships
 *   2. When the date passes, do the removal or bump the date with a reason.
 *
 * Implementation note: uses Node built-ins only (fs + path) so the test
 * does not add any dependency surface to the repo.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')

/** Directories to skip entirely. */
const SKIP_DIRS = new Set<string>([
  'node_modules',
  '.next',
  'build',
  'out',
  'coverage',
  'playwright-report',
  'test-results',
  'dist',
  'storybook-static',
  '.vercel',
  '.worktrees',
  'supabase',
])

/** Extensions to scan. */
const EXTENSIONS = new Set(['.ts', '.tsx'])

/** Files the scanner must not police (it is the policy, not the surface). */
const EXCLUDE_RELATIVE = new Set<string>([
  'lib/__tests__/deprecated-guard.test.ts',
])

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return acc
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    if (entry.startsWith('.')) continue

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

    acc.push(full)
  }

  return acc
}

/**
 * Extract every `@deprecated` line, along with a lookahead window of 3 lines
 * following it, so we can verify there is a `FIXME(YYYY-MM-DD)` nearby.
 */
interface Hit {
  file: string
  line: number
  snippet: string
  window: string
}

function findDeprecatedHits(source: string, file: string): Hit[] {
  const lines = source.split('\n')
  const hits: Hit[] = []

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('@deprecated')) continue
    const windowStart = i
    const windowEnd = Math.min(i + 4, lines.length)
    hits.push({
      file,
      line: i + 1,
      snippet: lines[i].trim().slice(0, 140),
      window: lines.slice(windowStart, windowEnd).join('\n'),
    })
  }

  return hits
}

/** Pull YYYY-MM-DD out of a FIXME tag if present within the window. */
function extractFixmeDate(windowText: string): Date | null {
  const match = windowText.match(/FIXME\s*\(\s*(\d{4})-(\d{2})-(\d{2})\s*\)/)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

describe('deprecated guard, undated @deprecated tags', () => {
  const files = walk(ROOT)

  it('finds at least one source file to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('every @deprecated is paired with a FIXME(YYYY-MM-DD) within 3 lines', () => {
    const violations: Array<{ rel: string; line: number; snippet: string; reason: string }> = []
    const now = Date.now()

    for (const file of files) {
      const raw = readFileSync(file, 'utf8')
      const rel = path.relative(ROOT, file)
      const hits = findDeprecatedHits(raw, rel)

      for (const hit of hits) {
        const date = extractFixmeDate(hit.window)
        if (!date) {
          violations.push({
            rel: hit.file,
            line: hit.line,
            snippet: hit.snippet,
            reason: 'missing FIXME(YYYY-MM-DD) within 3 lines',
          })
          continue
        }

        if (date.getTime() < now) {
          violations.push({
            rel: hit.file,
            line: hit.line,
            snippet: hit.snippet,
            reason: `FIXME date ${date.toISOString().slice(0, 10)} has passed, remove the @deprecated surface or bump the date with a reason`,
          })
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map(v => `  ${v.rel}:${v.line}  ${v.reason}\n    ${v.snippet}`)
        .join('\n')
      throw new Error(
        `Deprecated guard failed: ${violations.length} violation(s).\n${report}\n\n` +
          `Every @deprecated must be paired with a FIXME(YYYY-MM-DD) within 3 lines. ` +
          `When the date passes, remove the surface or bump the date.`,
      )
    }

    expect(violations).toEqual([])
  })
})
