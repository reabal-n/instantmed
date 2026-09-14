// Loopback-only wrapper proof: real component, PanelProvider and Tailwind.
// No Next server, env loader, database, patient records or external provider.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
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
const scratch = await mkdtemp(join(outputRoot, 'instantmed-prescription-history-'))
const aliases = {
  '@/app/actions/manual-patient': 'export async function refreshPatientParchmentPrescriptionsAction() { window.providerRefreshCount = (window.providerRefreshCount || 0) + 1; await new Promise(r => setTimeout(r, 100)); return new URLSearchParams(location.search).has("provider-error") ? { success: false, error: "Synthetic provider unavailable" } : { success: true } }',
  '@/app/doctor/queue/actions': 'export async function issueRefundAction() { throw new Error("Not used") }',
  'next/link': 'export default function Link({ children, prefetch, ...props }) { return <a {...props}>{children}</a> }',
  'next/navigation': 'export function useRouter() { return { refresh() {} } }',
}
await build({
  entryPoints: ['scripts/fixtures/prescription-history-browser.tsx'], bundle: true, jsx: 'automatic',
  outfile: join(scratch, 'fixture.js'), platform: 'browser', format: 'esm',
  define: { 'process.env.NODE_ENV': '"test"', 'process.env': '{}' },
  plugins: [{ name: 'isolated-parchment-seams', setup(b) {
    b.onResolve({ filter: /.*/ }, args => aliases[args.path] ? { path: args.path, namespace: 'fixture' } : undefined)
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: aliases[args.path], loader: 'tsx', resolveDir: process.cwd() }))
  } }],
})
const css = await postcss([tailwind()]).process(await readFile('app/globals.css', 'utf8'), { from: resolve('app/globals.css') })
const staffSource = await readFile('app/staff.css', 'utf8')
const staffCss = await postcss([tailwind()]).process(staffSource, { from: resolve('app/staff.css') })
await writeFile(join(scratch, 'fixture.css'), css.css + '\n' + staffCss.css)
const server = createServer(async (req, res) => {
  if (req.url === '/fixture.js' || req.url === '/fixture.css') {
    res.setHeader('content-type', req.url.endsWith('.css') ? 'text/css' : 'application/javascript')
    res.end(await readFile(join(scratch, req.url.slice(1))))
  } else {
    res.setHeader('content-type', 'text/html')
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>')
  }
})
await new Promise((ok, fail) => { server.once('error', fail); server.listen(3060, '127.0.0.1', ok) })
let browser
try {
  browser = await chromium.launch()
  for (const width of [1280, 390]) for (const dark of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: dark ? 'dark' : 'light' })
    const errors = []
    await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : (errors.push('External request'), route.abort()))
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:3060')
    if (dark) await page.evaluate(() => document.documentElement.classList.add('dark'))
    const section = page.getByRole('region', { name: 'Prescribed through InstantMed' })
    await section.getByText('Synthetic medicine 1 10 mg', { exact: true }).waitFor()
    assert.equal(await section.getByRole('listitem').count(), 3)
    assert.match(await section.innerText(), /Dose and frequency: Not recorded/)
    await section.getByRole('button', { name: /Show .* older/ }).click()
    assert.equal(await section.getByRole('listitem').count(), 5)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    const directions = section.getByText(/Only when needed/).first()
    assert.equal(await directions.evaluate(el => getComputedStyle(el).webkitLineClamp), 'none')
    await page.screenshot({ path: join(scratch, `history-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Refresh from Parchment' }).click()
    await page.getByRole('status').getByText('Prescription history refreshed.', { exact: true }).waitFor()
    await section.getByText('Refreshed synthetic medicine 10 mg', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Simulate load error' }).click()
    await section.getByText('Could not load prescription history. Try refreshing.').waitFor()
    for (const failure of ['provider-error', 'reload-error']) {
      await page.goto(`http://127.0.0.1:3060/?${failure}`)
      await page.getByRole('button', { name: 'Refresh from Parchment' }).click()
      await page.getByRole('status').getByText(failure === 'provider-error' ? 'Synthetic provider unavailable' : 'Could not reload prescription history. Showing the previously loaded records.').waitFor()
    }
    await page.goto('http://127.0.0.1:3060/?unavailable')
    await page.getByRole('button', { name: 'Reload history' }).click()
    await page.getByRole('status').getByText('Prescription history refreshed.', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.providerRefreshCount || 0), 0)
    assert.deepEqual(errors, [])
    await context.close()
    console.log(`PASS ${width} ${dark ? 'dark' : 'light'}: directions, pagination, refresh, errors, overflow`)
  }
  console.log(`Evidence: ${scratch}`)
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
