// Real component and CSRF client, synthetic loopback responses only.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import tailwind from '@tailwindcss/postcss'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss')
const scratch = await mkdtemp(join(tmpdir(), 'instantmed-request-access-'))
let server
let browser
try {
  await build({ entryPoints: ['scripts/fixtures/request-access-browser.tsx'], bundle: true,
    jsx: 'automatic', outfile: join(scratch, 'fixture.js'), platform: 'browser', format: 'esm',
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
    plugins: [{ name: 'next-link-seam', setup(b) {
      b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'tsx', resolveDir: process.cwd(),
        contents: 'export default function Link({children, prefetch, ...props}) { return <a {...props}>{children}</a> }' }))
    } }],
  })
  const css = await postcss([tailwind()]).process(await readFile('app/globals.css', 'utf8'), { from: resolve('app/globals.css') })
  server = createServer(async (req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('content-type', 'application/javascript'); res.end(await readFile(join(scratch, 'fixture.js'))) }
    else if (req.url === '/fixture.css') { res.setHeader('content-type', 'text/css'); res.end(css.css) }
    else { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>') }
  })
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(3060, '127.0.0.1', ok) })
  browser = await chromium.launch()
  await mkdir('test-results/request-access', { recursive: true })
  for (const width of [375, 1440]) for (const dark of [false, true]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const errors = []
    let posts = 0
    let failSend = false
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin !== 'http://127.0.0.1:3060') { errors.push('Unexpected external request'); return route.abort() }
      if (url.pathname === '/api/csrf') return route.fulfill({ json: { token: 'synthetic-csrf' } })
      if (url.pathname === '/track/request/access-link') {
        posts++
        assert.equal(route.request().method(), 'POST')
        assert.equal(route.request().postData(), null)
        assert.equal(route.request().headers()['x-csrf-token'], 'synthetic-csrf')
        return route.fulfill({ status: failSend ? 503 : 200, json: { accepted: true } })
      }
      return route.continue()
    })
    await page.clock.install()
    await page.goto('http://127.0.0.1:3060/track/request')
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
    const send = page.getByRole('button', { name: 'Email me a secure access link', exact: true })
    await send.focus()
    await send.press('Enter')
    await expect(page.getByRole('status')).toContainText('new sign-in or confirmation email')
    const retry = page.getByRole('button', { name: /Request another link|Link requested/ })
    await expect(retry).toBeDisabled()
    await page.clock.fastForward(59_000)
    await expect(retry).toBeDisabled()
    assert.equal(posts, 1)
    await page.clock.fastForward(1_000)
    await expect(page.getByRole('button', { name: 'Request another link', exact: true })).toBeEnabled()
    failSend = true
    await page.getByRole('button', { name: 'Request another link', exact: true }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    failSend = false
    await page.getByRole('button', { name: /Request another link|Email me a secure access link/ }).click()
    await expect(page.getByRole('status')).toContainText('new sign-in or confirmation email')
    assert.equal(posts, 3)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: `test-results/request-access/${width}-${dark ? 'dark' : 'light'}.png` })
    const reopen = page.getByRole('link', { name: 'I’ve signed in. Open my request', exact: true })
    await expect(reopen).toHaveAttribute('href', '/track/request')
    const navigation = page.waitForRequest(request => request.isNavigationRequest() && request.url() === 'http://127.0.0.1:3060/track/request')
    await reopen.click()
    await navigation
    assert.equal(posts, 3, 'Rechecking access must not request another email')
    assert.deepEqual(errors, [])
    await page.close()
    console.log(`PASS ${width} ${dark ? 'dark' : 'light'}: keyboard send, cooldown, retry, failure recovery, fresh navigation, overflow`)
  }
} finally {
  await browser?.close()
  if (server) await new Promise(ok => server.close(ok))
  await rm(scratch, { recursive: true, force: true })
}
