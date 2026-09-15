// Real boundary/component lifecycle proof; no auth server, clinical data or provider traffic.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const scratch = await mkdtemp(join(tmpdir(), 'instantmed-navigation-bootstrap-'))
let server
let browser
try {
  await build({ entryPoints: ['scripts/fixtures/navigation-bootstrap-browser.tsx'], bundle: true,
    jsx: 'automatic', outfile: join(scratch, 'fixture.js'), platform: 'browser', format: 'esm',
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
    plugins: [{ name: 'navigation-fixture-seams', setup(b) {
      b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'fixture' }))
      b.onResolve({ filter: /^@\/lib\/supabase\/auth-provider$/ }, () => ({ path: 'auth', namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', resolveDir: process.cwd(), contents: args.path === 'auth'
        ? `export { useFixtureAuth as useAuth } from ${JSON.stringify(resolve('scripts/fixtures/navigation-bootstrap-browser.tsx'))}`
        : 'export const usePathname = () => window.location.pathname; export const useRouter = () => ({ push() {} })' }))
    } }],
  })
  server = createServer(async (req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('content-type', 'application/javascript'); res.end(await readFile(join(scratch, 'fixture.js'))) }
    else { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><html><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>') }
  })
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(3060, '127.0.0.1', ok) })
  browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); process.stderr.write(`${error.message}\n`) })
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:3060'
    ? route.continue() : route.abort())
  await page.goto('http://127.0.0.1:3060/patient')
  await page.waitForFunction(() => window.navigationFixture, undefined, { timeout: 5000 })
  const input = page.getByRole('textbox', { name: 'Synthetic draft' })
  const resolveScope = async scope => {
    const transition = await page.evaluate(next => {
      const expected = Number(document.querySelector('[data-fixture-transition]').dataset.fixtureTransition) + 1
      window.navigationFixture.resolve(next)
      return expected
    }, scope)
    await page.locator(`[data-fixture-transition="${transition}"]`).waitFor()
  }
  await input.fill('Synthetic unsaved edit')
  await page.evaluate(() => { window.originalInput = document.querySelector('input') })
  await resolveScope('actor-a:session-one')
  assert.equal(await input.inputValue(), 'Synthetic unsaved edit', 'Initial auth must preserve child state')
  assert.equal(await page.evaluate(() => window.originalInput === document.querySelector('input')), true)
  assert.deepEqual(await page.evaluate(() => window.navigationFixture.counters), { mounts: 1, unmounts: 0 })
  await resolveScope('actor-a:session-one')
  assert.equal(await input.inputValue(), 'Synthetic unsaved edit')
  await resolveScope('actor-b:session-two')
  await page.waitForFunction(() => window.navigationFixture.counters.unmounts === 1)
  assert.equal(await input.inputValue(), '')
  assert.equal(await page.evaluate(() => window.originalInput === document.querySelector('input')), false)
  await input.fill('Second actor edit')
  await resolveScope(null)
  await page.waitForFunction(() => window.navigationFixture.counters.unmounts === 2)
  assert.equal(await input.inputValue(), '', 'Logout clears the established actor subtree')
  await resolveScope('actor-b:session-three')
  assert.equal(await input.inputValue(), '')
  await page.goto('http://127.0.0.1:3060/dashboard')
  await page.waitForFunction(() => window.navigationFixture)
  await resolveScope('actor-a:session-one')
  await input.fill('Synthetic staff edit')
  await resolveScope(null)
  await page.getByRole('status').waitFor()
  assert.equal(await input.count(), 0, 'Established staff session loss hides previous content')
  assert.deepEqual(errors, [])
  process.stdout.write('Navigation bootstrap preserves initial mounts and edits; actor changes remount and staff session loss hides old content.\n')
} finally {
  await browser?.close()
  if (server) await new Promise(ok => server.close(ok))
  await rm(scratch, { recursive: true, force: true })
}
