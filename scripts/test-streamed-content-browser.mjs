// Reproduces the pinned Next renderer's hydration replay defect, then checks the real boundary.
// Synthetic DOM only: no environment files, auth, application backend or provider calls.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const scratch = await mkdtemp(join(tmpdir(), 'instantmed-streamed-content-'))
const origin = 'http://127.0.0.1:3060'
const repetitions = 10
// App Router uses Next's bundled renderer, not the standalone React 18 dependency.
const aliases = {
  'react': require.resolve('next/dist/compiled/react'),
  'react/jsx-runtime': require.resolve('next/dist/compiled/react/jsx-runtime'),
  'react/jsx-dev-runtime': require.resolve('next/dist/compiled/react/jsx-dev-runtime'),
  'react-dom': require.resolve('next/dist/compiled/react-dom'),
  'react-dom/client': require.resolve('next/dist/compiled/react-dom/client'),
  'scheduler': require.resolve('next/dist/compiled/scheduler'),
}
let server
let browser
try {
  await build({
    entryPoints: ['scripts/fixtures/streamed-content-browser.jsx'],
    bundle: true, jsx: 'automatic', outfile: join(scratch, 'fixture.js'),
    platform: 'browser', format: 'esm', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'next-compiled-react', setup(builder) {
      builder.onResolve({ filter: /^(react(?:\/jsx-(?:dev-)?runtime)?|react-dom(?:\/client)?|scheduler)$/ },
        args => ({ path: aliases[args.path] }))
    } }],
  })
  server = createServer(async (req, res) => {
    if (req.url === '/fixture.js') {
      res.setHeader('Content-Type', 'application/javascript')
      res.end(await readFile(join(scratch, 'fixture.js')))
    } else {
      res.setHeader('Content-Type', 'text/html')
      // Completed Suspense markup exercises deferred hydration, as streamed routes do.
      res.end('<!doctype html><html><body><div id="root"><!--$--><label>value<input aria-label="Synthetic edit" value="Initial"></label><!--/$--></div><script type="module" src="/fixture.js"></script></body></html>')
    }
  })
  await new Promise((ok, fail) => {
    server.once('error', fail)
    server.listen(3060, '127.0.0.1', ok)
  })
  browser = await chromium.launch()
  for (const mode of ['direct', 'wrapped']) {
    for (let iteration = 0; iteration < repetitions; iteration++) {
      const page = await browser.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      await page.route('**/*', route => new URL(route.request().url()).origin === origin
        ? route.continue() : route.abort())
      await page.goto(`${origin}/?mode=${mode}`)
      await page.waitForFunction(() => window.probe?.done, undefined, { timeout: 5000 })
      const result = await page.evaluate(() => window.probe)
      assert.deepEqual(errors, [])
      if (mode === 'direct') {
        // Negative control must keep failing until the pinned renderer is deliberately upgraded.
        assert.equal(result.errors.length, 1)
        assert.ok(result.errors[0].includes('#418'), 'Direct host child must reproduce hydration failure')
        assert.equal(result.sameLabel, false)
        assert.equal(result.sameInput, false)
        assert.equal(result.value, 'Initial')
      } else {
        assert.deepEqual(result.errors, [])
        assert.equal(result.sameLabel, true)
        assert.equal(result.sameInput, true)
        assert.equal(result.value, 'Edited before hydration')
      }
      await page.close()
    }
  }
  process.stdout.write(`Streamed hydration: ${repetitions} negative controls reproduce React 418; ${repetitions} real-boundary runs preserve DOM and edited input without errors.\n`)
} finally {
  await browser?.close()
  if (server) await new Promise(ok => server.close(ok))
  await rm(scratch, { recursive: true, force: true })
}
