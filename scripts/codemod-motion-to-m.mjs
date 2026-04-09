#!/usr/bin/env node
/**
 * One-shot codemod: rewrite `motion` imports from `framer-motion` to use the
 * tree-shakable `m` proxy via `import { m as motion }`. This keeps every JSX
 * call site (`<motion.div>`) untouched while flipping the import to the proxy
 * that LazyMotion + strict mode actually short-circuits.
 *
 * Run: node scripts/codemod-motion-to-m.mjs
 *
 * The script:
 *   - Walks the project for .ts/.tsx files (excludes node_modules, .next,
 *     scripts/, and the codemod source itself).
 *   - Looks for ESM import lines that name `motion` from "framer-motion".
 *   - Replaces the first occurrence of the `motion` identifier inside the
 *     import braces with `m as motion`. Type imports, MotionConfig,
 *     useMotionValue, etc. are not touched.
 *   - Skips files that already import `m as motion` or `m,` from framer-motion.
 *   - Skips lib/motion.ts (no runtime framer-motion import) and the
 *     MotionProvider itself.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(__filename), '..')

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.worktrees',
  '.vercel',
  '.supabase',
  '.cursor',
  '.windsurf',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
  'scripts',
])

/** @type {string[]} */
const allFiles = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
    } else if (/\.(tsx?|jsx?|mjs)$/.test(entry.name)) {
      allFiles.push(full)
    }
  }
}

walk(repoRoot)

// Match an ESM import statement (single line) that pulls from "framer-motion"
// and contains a bare `motion` named import. Group 1 = the brace contents.
const IMPORT_LINE_RE =
  /import\s*\{([^}]*)\}\s*from\s*['"]framer-motion['"]/g

// Within the brace contents, replace the first bare `motion` token (not part
// of a longer identifier, not already `m as motion`).
function rewriteBraceContents(braceContents) {
  // If the file already imports `m` from framer-motion in another way, skip.
  if (/\bm\s+as\s+motion\b/.test(braceContents)) return null
  if (/(^|[\s,])\s*m\s*(,|$)/.test(braceContents)) return null

  // Ensure there's a bare `motion` to rewrite — not `MotionConfig`,
  // `motionValue`, `useMotionValue`, `useMotionTemplate`, etc.
  // The lookahead permits whitespace/comma OR end-of-string (since the
  // closing `}` lives outside the captured brace contents).
  const bareMotionRe = /(^|[\s,])motion(?=\s|,|$)/
  if (!bareMotionRe.test(braceContents)) return null

  // Replace just the identifier `motion` with `m as motion`. The lead group
  // preserves leading whitespace/comma.
  return braceContents.replace(
    bareMotionRe,
    (_match, lead) => `${lead}m as motion`,
  )
}

let changed = 0
let skipped = 0
let unchanged = 0

for (const file of allFiles) {
  const rel = path.relative(repoRoot, file)
  if (rel === path.join('lib', 'motion.ts')) {
    skipped++
    continue
  }
  if (rel === path.join('components', 'providers', 'motion-provider.tsx')) {
    skipped++
    continue
  }

  const original = fs.readFileSync(file, 'utf8')
  if (!original.includes('framer-motion')) {
    unchanged++
    continue
  }

  let touched = false
  const next = original.replace(IMPORT_LINE_RE, (match, braceContents) => {
    const rewritten = rewriteBraceContents(braceContents)
    if (rewritten == null) return match
    touched = true
    return match.replace(braceContents, rewritten)
  })

  if (touched && next !== original) {
    fs.writeFileSync(file, next, 'utf8')
    changed++
    console.log(`updated  ${rel}`)
  } else {
    unchanged++
  }
}

console.log(
  `\ncodemod complete — changed ${changed}, skipped ${skipped}, untouched ${unchanged}`,
)
