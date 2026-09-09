// Loopback-only wrapper proof: real component, PanelProvider and Tailwind.
// No Next server, env loader, database, patient records or external provider.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import tailwind from '@tailwindcss/postcss'
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss')
const outputDirectory = process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length)
if (outputDirectory !== undefined && !outputDirectory.trim()) throw new Error('--output-dir requires a directory')
const outputRoot = outputDirectory ? resolve(outputDirectory) : tmpdir()
await mkdir(outputRoot, { recursive: true })
// Each invocation owns a fresh directory; never remove another suite's evidence.
const scratch = await mkdtemp(join(outputRoot, 'instantmed-parchment-workspace-'))
const baseline = process.argv.includes('--baseline')
const scenarioFilter = process.argv.find(arg => arg.startsWith('--scenario='))?.slice('--scenario='.length)
const componentPath = '@/components/doctor/parchment-prescribe-panel'
const aliases = {
  '@/app/actions/parchment': 'export async function getParchmentPrescribeUrlAction(intakeId) { return window.prescribingFixtureSession(intakeId) }',
  '@/app/actions/manual-patient': 'export async function getPatientParchmentPrescribeUrlAction() { return window.prescribingFixtureSession() }',
  '@/app/actions/medication-reference': 'export async function resolveGenericMedicationNameAction() { return {success:false} }',
  'next/navigation': 'export function usePathname() { return "/fixture" }',
}
if (baseline) aliases[componentPath] = execFileSync('git', ['show', '8a18405bbdb4954334c476f601cab11b1adbfedb:components/doctor/parchment-prescribe-panel.tsx'], { encoding: 'utf8' })
await build({
  entryPoints: ['scripts/fixtures/parchment-workspace-browser.tsx'], bundle: true, jsx: 'automatic',
  outfile: join(scratch, 'fixture.js'), platform: 'browser', format: 'esm',
  define: { 'process.env.NODE_ENV': '"test"', 'process.env': '{}' },
  plugins: [{ name: 'isolated-parchment-seams', setup(b) {
    b.onResolve({ filter: /.*/ }, args => aliases[args.path] ? { path: args.path, namespace: 'fixture' } : undefined)
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: aliases[args.path], loader: 'tsx', resolveDir: process.cwd() }))
  } }],
})
const css = await postcss([tailwind()]).process(await readFile('app/globals.css', 'utf8'), { from: resolve('app/globals.css') })
let staffSource = await readFile('app/staff.css', 'utf8')
if (baseline) {
  const baselineSource = join(scratch, 'baseline-component.tsx')
  await writeFile(baselineSource, aliases[componentPath])
  staffSource += `\n@source "${baselineSource}";\n`
}
const staffCss = await postcss([tailwind()]).process(staffSource, { from: resolve('app/staff.css') })
await writeFile(join(scratch, 'fixture.css'), css.css + '\n' + staffCss.css)
console.log(`Wrapper evidence directory: ${scratch}`)
if (process.argv.includes('--build-only')) process.exit(0)
const server = createServer(async (req, res) => {
  if (req.url === '/fixture.js' || req.url === '/fixture.css') {
    res.setHeader('content-type', req.url.endsWith('.css') ? 'text/css' : 'application/javascript')
    res.end(await readFile(join(scratch, req.url.slice(1))))
  } else if (req.url.startsWith('/provider')) {
    res.setHeader('content-type', 'text/html')
    res.end('<!doctype html><html><body><label>Mock medicine search<input aria-label="Mock medicine search"></label><p>Local mock provider. No prescription is issued.</p></body></html>')
  } else {
    res.setHeader('content-type', 'text/html')
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>')
  }
})
await new Promise((ok, fail) => { server.once('error', fail); server.listen(3060, '127.0.0.1', ok) })
const results = []
let browser
try {
  browser = await chromium.launch()
  const run = async (name, fn, viewport = { width: 1366, height: 768 }, dark = false) => {
    if (scenarioFilter && !name.includes(scenarioFilter)) return
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: dark ? 'dark' : 'light', permissions: ['clipboard-read', 'clipboard-write'] })
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
    const unexpected = []
    await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : (unexpected.push(route.request().url()), route.abort()))
    await context.addInitScript(() => {
      window.fixtureMode = 'success'; window.fixtureAttempt = 0
      window.fixtureSessions = []; window.fixtureResolvers = {}
      window.prescribingFixtureSession = async (intakeId) => {
        const attempt = ++window.fixtureAttempt
        window.fixtureSessions.push({ attempt, intakeId })
        if (window.fixtureMode === 'failure') return { success: false, error: 'Synthetic session failure' }
        if (window.fixtureMode === 'pending') await new Promise(resolve => { window.resolveFixtureSession = resolve; window.fixtureResolvers[intakeId] = resolve })
        return { success: true, ssoUrl: `http://127.0.0.1:3060/provider?attempt=${attempt}&request=${encodeURIComponent(intakeId || 'patient')}` }
      }
    })
    if (dark) await context.addInitScript(() => {
      new MutationObserver(() => document.documentElement?.classList.add('dark')).observe(document, { childList: true })
      document.documentElement?.classList.add('dark')
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    try {
      await fn(page)
      assert.deepEqual(unexpected, [], 'No external traffic')
      assert.deepEqual(errors, [], 'No uncaught browser errors')
      results.push({ name, status: 'pass' })
      console.log(`PASS ${name}`)
    } catch (error) {
      results.push({ name, status: 'fail', error: error.message })
      console.log(`FAIL ${name}: ${error.message}`)
    }
    finally {
      try { await page.screenshot({ path: join(scratch, `${name}.png`) }) }
      finally {
        try { await context.tracing.stop({ path: join(scratch, `${name}.zip`) }) }
        finally { await context.close() }
      }
      await writeFile(join(scratch, 'results.json'), JSON.stringify({ baseline, results }, null, 2))
    }
  }
  const open = async (page, query = '') => {
    await page.goto(`http://localhost:3060/fixture${query}`)
    await page.getByRole('button', { name: 'Open prescribing', exact: true }).click()
    await page.getByRole('dialog').waitFor()
  }
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 360, height: 740 }]) {
    for (const dark of [false, true]) for (const long of [false, true]) await run(`layout-${viewport.width}-${long ? 'long' : 'short'}-${dark ? 'dark' : 'light'}`, async page => {
      await open(page, long ? '?long=1' : '')
      await page.frameLocator('iframe').getByRole('textbox', { name: 'Mock medicine search' }).fill('Synthetic query')
      await page.waitForFunction(() => {
        const frame = document.querySelector('iframe')
        return frame && getComputedStyle(frame).opacity === '1'
      })
      await page.screenshot({ path: join(scratch, `layout-${viewport.width}-${long ? 'long' : 'short'}-${dark ? 'dark' : 'light'}-workspace.png`) })
      const area = await page.locator('iframe').boundingBox()
      const reference = await page.locator('[data-parchment-medication-context]').boundingBox()
      assert.ok(area && reference)
      const computed = await page.locator('[data-parchment-medication-context]').evaluate(reference => ({
        referenceDisplay: getComputedStyle(reference).display,
        parentDisplay: getComputedStyle(reference.parentElement).display,
        columns: getComputedStyle(reference.parentElement).gridTemplateColumns,
        wideMedia: matchMedia('(min-width: 1280px)').matches,
      }))
      results.push({ name: `geometry-${viewport.width}-${long}-${dark}`, area, reference, computed })
      if (viewport.width >= 1280) {
        assert.ok(area.width >= 800, `Provider width ${area.width}`)
        assert.ok(area.height >= viewport.height - 150, `Provider height ${area.height}`)
        assert.ok(reference.x + reference.width <= area.x + 1, 'Reference sits beside provider')
      } else assert.ok(reference.y + reference.height <= area.y + 1, 'Reference sits above provider')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      assert.equal(await page.locator('[data-parchment-medication-context]').count(), 1)
      const warning = 'Alpha blockers can increase hypotension risk with PDE5 inhibitors. Confirm medication and dosing separation.'
      if (long) {
        const warningElement = page.getByText(warning, { exact: true })
        await warningElement.scrollIntoViewIfNeeded()
        assert.equal(await warningElement.isVisible(), true)
        assert.equal(await page.getByRole('button', { name: 'Clinical details' }).getAttribute('aria-expanded'), 'false')
      }
      await page.getByRole('button', { name: 'Copy verified generic medicine name', exact: true }).click()
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Synthetic medicine')
      await page.getByRole('button', { name: 'Copy patient-reported directions', exact: true }).click()
      const expectedDirections = long
        ? Array.from({ length: 30 }, (_, i) => `Synthetic medicine ${i + 1}: one 5 mg tablet on alternate mornings, only when needed.`).join('\n')
        : 'One tablet on alternate mornings, only when needed.'
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expectedDirections)
      await page.getByRole('button', { name: 'Copy patient-reported frequency', exact: true }).click()
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Alternate mornings')
      const detail = page.getByRole('button', { name: 'Clinical details' })
      await detail.click()
      await page.getByText('Synthetic assessment detail', { exact: true }).scrollIntoViewIfNeeded()
      assert.equal(await page.getByText('Synthetic assessment detail', { exact: true }).isVisible(), true)
      await page.screenshot({ path: join(scratch, `layout-${viewport.width}-${long ? 'long' : 'short'}-${dark ? 'dark' : 'light'}-details.png`) })
      await page.getByRole('button', { name: 'Close panel', exact: true }).click()
      results.push({ name: `dimensions-${viewport.width}-${long}`, area, reference })
    }, viewport, dark)
  }
  await run('return-focus-overflow-note', async page => {
    await page.goto('http://localhost:3060/fixture')
    await page.evaluate(() => { document.body.style.overflow = 'clip' })
    const trigger = page.getByRole('button', { name: 'Open prescribing', exact: true })
    await trigger.click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
    await page.waitForFunction(() => document.activeElement?.textContent === 'Open prescribing', { }, { timeout: 3000 })
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'clip')
    assert.equal(await page.getByRole('textbox').inputValue(), 'Synthetic retained note')
  })
  await run('retry-clears-old-session-and-reveal', async page => {
    await page.route('**/provider?*', () => {}) // Hold only the loopback frame response.
    await open(page)
    await page.getByRole('button', { name: 'Retry session', exact: true }).waitFor({ timeout: 12000 })
    await page.evaluate(() => { window.fixtureMode = 'pending' })
    await page.locator('iframe').evaluate(frame => frame.dispatchEvent(new Event('load')))
    await page.getByRole('button', { name: 'Retry session', exact: true }).click()
    await page.waitForTimeout(800)
    assert.equal(await page.locator('iframe').count(), 0, 'Old frame removed while replacement session mints')
    await page.evaluate(() => window.resolveFixtureSession())
    await page.locator('iframe').waitFor({ state: 'attached' })
    assert.equal(await page.locator('iframe').evaluate(frame => getComputedStyle(frame).opacity), '0', 'Old reveal timer cannot expose replacement frame')
  })
  await run('stale-reveal-cannot-expose-replacement', async page => {
    await page.route('**/provider?*', () => {})
    await open(page)
    await page.getByRole('button', { name: 'Retry session', exact: true }).waitFor({ timeout: 12000 })
    await page.evaluate(() => {
      window.fixtureMode = 'pending'
      document.querySelector('iframe').dispatchEvent(new Event('load'))
      Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Retry session')).click()
    })
    // Mint the replacement before the previous frame's 600ms reveal fires.
    // Its frame response stays held throughout, so only the old timer can reveal it.
    await page.waitForFunction(() => typeof window.resolveFixtureSession === 'function')
    await page.evaluate(() => window.resolveFixtureSession())
    await page.locator('iframe[src*="attempt=2"]').waitFor({ state: 'attached' })
    await page.waitForTimeout(950)
    assert.equal(await page.locator('iframe').evaluate(frame => getComputedStyle(frame).opacity), '0', 'Earlier onLoad must not reveal an unloaded replacement')
  })
  await run('failed-retry-recovery', async page => {
    await page.route('**/provider?*', () => {})
    await open(page)
    await page.getByRole('button', { name: 'Retry session', exact: true }).waitFor({ timeout: 12000 })
    await page.evaluate(() => { window.fixtureMode = 'failure' })
    await page.getByRole('button', { name: 'Retry session', exact: true }).click()
    await page.getByText('Synthetic session failure', { exact: true }).waitFor()
    assert.equal(await page.locator('iframe').count(), 0, 'Failed session does not retain provider overlay')
    await page.getByRole('button', { name: 'Try Again', exact: true }).click()
    assert.equal(await page.getByText('Synthetic session failure', { exact: true }).isVisible(), true)
  })
  await run('external-tab-fresh-session-return', async page => {
    await open(page)
    await page.waitForFunction(() => { const frame = document.querySelector('iframe'); return frame && getComputedStyle(frame).opacity === '1' })
    const originalUrl = await page.locator('iframe').getAttribute('src')
    const popupReady = page.context().waitForEvent('page')
    await page.getByRole('button', { name: 'Open Parchment in a new tab', exact: true }).click()
    const popup = await popupReady
    await popup.getByRole('textbox', { name: 'Mock medicine search' }).waitFor()
    assert.notEqual(popup.url(), originalUrl, 'External tab mints a fresh session')
    assert.equal(new URL(popup.url()).searchParams.get('request'), 'synthetic-prescribing')
    assert.equal(await page.locator('iframe').getAttribute('src'), originalUrl, 'External session does not replace in-progress iframe')
    await popup.close()
    await page.bringToFront()
    assert.equal(await page.getByRole('dialog', { name: 'Prescribe for Synthetic Patient' }).isVisible(), true)
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
    assert.equal(await page.locator('[data-fixture-selected-request]').getAttribute('data-fixture-selected-request'), 'synthetic-prescribing')
    assert.equal(await page.getByRole('textbox').inputValue(), 'Synthetic retained note')
    assert.deepEqual(await page.evaluate(() => window.fixtureEvents), { completion: 0 })
    assert.deepEqual(await page.evaluate(() => window.fixtureSessions.map(session => session.intakeId)), ['synthetic-prescribing', 'synthetic-prescribing'])
  })
  await run('replacement-ignores-pending-old-session', async page => {
    await page.goto('http://localhost:3060/fixture')
    await page.evaluate(() => { window.fixtureMode = 'pending' })
    await page.getByRole('button', { name: 'Open prescribing', exact: true }).click()
    await page.waitForFunction(() => typeof window.fixtureResolvers['synthetic-prescribing'] === 'function')
    await page.evaluate(() => { window.fixtureMode = 'success' })
    // Simulate the owning review selecting a different request while open.
    await page.getByRole('button', { name: 'Replace request', exact: true }).evaluate(button => button.click())
    await page.getByRole('dialog', { name: 'Prescribe for Replacement Patient' }).waitFor()
    await page.waitForFunction(() => { const frame = document.querySelector('iframe'); return frame && getComputedStyle(frame).opacity === '1' })
    const replacementUrl = await page.locator('iframe').getAttribute('src')
    assert.equal(new URL(replacementUrl).searchParams.get('request'), 'synthetic-replacement')
    await page.evaluate(() => window.fixtureResolvers['synthetic-prescribing']())
    await page.waitForTimeout(750)
    assert.equal(await page.locator('iframe').getAttribute('src'), replacementUrl)
    assert.equal(await page.getByText('Replacement medicine 10 mg', { exact: true }).isVisible(), true)
    assert.equal(await page.getByText('Two 10 mg tablets at night, only when needed.', { exact: true }).isVisible(), true)
    assert.equal(await page.getByText('Synthetic medicine 5 mg', { exact: true }).count(), 0)
    assert.deepEqual(await page.evaluate(() => window.fixtureEvents), { completion: 0 })
  })
  await run('replacement-ignores-old-reveal-timer', async page => {
    await page.route('**/provider?*', () => {})
    await open(page)
    await page.locator('iframe').waitFor({ state: 'attached' })
    await page.evaluate(() => {
      document.querySelector('iframe').dispatchEvent(new Event('load'))
      Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Replace request').click()
    })
    await page.getByRole('dialog', { name: 'Prescribe for Replacement Patient' }).waitFor()
    await page.locator('iframe[src*="synthetic-replacement"]').waitFor({ state: 'attached' })
    await page.waitForTimeout(950)
    assert.equal(await page.locator('iframe').evaluate(frame => getComputedStyle(frame).opacity), '0', 'Old case reveal cannot expose replacement case')
    assert.equal(await page.getByText('Replacement medicine 10 mg', { exact: true }).isVisible(), true)
    assert.deepEqual(await page.evaluate(() => window.fixtureSessions.map(session => session.intakeId)), ['synthetic-prescribing', 'synthetic-replacement'])
    assert.deepEqual(await page.evaluate(() => window.fixtureEvents), { completion: 0 })
  })
  await run('basic-panel-focus-boundaries', async page => {
    await page.goto('http://localhost:3060/fixture')
    await page.getByRole('button', { name: 'Open basic panel', exact: true }).click()
    const first = page.getByRole('button', { name: 'First action', exact: true })
    const last = page.getByRole('button', { name: 'Close basic panel', exact: true })
    await page.waitForFunction(() => document.activeElement?.textContent === 'First action')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await last.evaluate(button => button === document.activeElement), true, 'Reverse wrap skips hidden controls')
    await page.keyboard.press('Tab')
    assert.equal(await first.evaluate(button => button === document.activeElement), true, 'Forward wrap stays in ordinary panel')
    await last.click()
    assert.equal(await page.getByRole('dialog').count(), 0)
  })
  await run('keyboard-provider-entry', async page => {
    await open(page)
    await page.frameLocator('iframe').getByRole('textbox', { name: 'Mock medicine search' }).waitFor()
    await page.getByRole('button', { name: 'Close panel', exact: true }).focus()
    let entered = false
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      entered = await page.frameLocator('iframe').getByRole('textbox', { name: 'Mock medicine search' }).evaluate(input => input === document.activeElement)
      if (entered) break
    }
    assert.equal(entered, true, 'Tab reaches provider input from wrapper controls')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')?.contains(document.activeElement))), true, 'Forward Tab from provider stays inside the dialog')
    await page.frameLocator('iframe').getByRole('textbox', { name: 'Mock medicine search' }).focus()
    let returned = false
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab')
      returned = await page.getByRole('button', { name: 'Close panel', exact: true }).evaluate(button => button === document.activeElement)
      if (returned) break
    }
    assert.equal(returned, true, 'Shift+Tab returns to Close')
  })
  await run('mobile-visual-viewport', async page => {
    await open(page)
    await page.frameLocator('iframe').getByRole('textbox', { name: 'Mock medicine search' }).fill('Synthetic query')
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 410 })
      window.visualViewport.dispatchEvent(new Event('resize'))
    })
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.getBoundingClientRect().height <= 410)
    const frame = await page.locator('iframe').boundingBox()
    assert.ok(frame.y + frame.height <= 411)
    assert.equal(await page.locator('[data-parchment-medication-context]').isVisible(), false)
    await page.getByRole('button', { name: 'Close panel', exact: true }).focus()
    await page.keyboard.press('Tab')
    assert.equal(await page.frameLocator('iframe').getByRole('textbox', { name: 'Mock medicine search' }).evaluate(input => input === document.activeElement), true, 'Keyboard skips hidden reference and reaches provider')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await page.getByRole('button', { name: 'Close panel', exact: true }).evaluate(button => button === document.activeElement), true)
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
    assert.equal(await page.getByRole('dialog').count(), 0)
  }, { width: 390, height: 844 })
} finally {
  if (browser) await browser.close()
  await new Promise(resolve => server.close(resolve))
  await writeFile(join(scratch, 'results.json'), JSON.stringify({ baseline, results }, null, 2))
  console.log(JSON.stringify({ baseline, results }, null, 2))
}
if (results.some(result => result.status === 'fail')) process.exitCode = 1
