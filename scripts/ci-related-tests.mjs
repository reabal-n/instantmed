import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

// Pass paths as arguments, never shell text. Rename sources are included too.
const paths = readFileSync('.ci-changed-files', 'utf8').split('\n').filter(Boolean)
if (!paths.length) throw new Error('Missing changed-file evidence for focused tests')
const result = spawnSync('pnpm', ['exec', 'vitest', 'related', '--run', '--passWithNoTests', ...paths], { stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
