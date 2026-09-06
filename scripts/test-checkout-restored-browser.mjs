// Isolated component/interaction proof. No Next env loader, global E2E setup,
// Supabase, email, analytics, or Stripe traffic. Uses the real ReviewStep/store.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss')
import tailwind from '@tailwindcss/postcss'
import assert from 'node:assert/strict'

const scratch = await mkdtemp(join(tmpdir(), 'instantmed-checkout-browser-'))
const aliases = {
  '@/app/actions/unified-checkout': 'export async function createCheckoutFromUnifiedFlow(input) { return (await fetch("/fixture-checkout", {method:"POST",body:JSON.stringify(input)})).json() }',
  '@/lib/analytics/capture': 'export function capture() {}',
  '@/lib/analytics/conversion-tracking': 'export async function trackFunnelStep() {}',
  '@/lib/analytics/posthog-context': 'export function usePostHog() { return null }',
}
await build({
  entryPoints: ['scripts/fixtures/checkout-restored-browser.tsx'], bundle: true, jsx: 'automatic',
  outfile: join(scratch, 'fixture.js'), platform: 'browser', format: 'esm',
  define: { 'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_PLAYWRIGHT': '"1"', 'process.env': '{}'  },
  plugins: [{ name: 'isolated-provider-seams', setup(b) {
    b.onResolve({ filter: /.*/ }, args => aliases[args.path] ? { path: args.path, namespace: 'fixture' } : undefined)
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: aliases[args.path], loader: 'js' }))
  } }],
})
const css = await postcss([tailwind()]).process(await readFile('app/globals.css', 'utf8'), { from: resolve('app/globals.css') })
await writeFile(join(scratch, 'fixture.css'), css.css)
let mode = 'fresh'
let checkoutCalls = 0
const server = createServer(async (req, res) => {
  if (req.url === '/fixture-checkout') {
    checkoutCalls++
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ success: false, failureCategory: mode !== 'blocked' ? 'identity_or_session' : 'payment_provider', failureCode: mode !== 'blocked' ? 'auth_or_session' : 'payment_provider', failureTaxonomyVersion: 'checkout_v2_20260905',
      error: mode === 'sign_in' ? "We couldn't verify access to this saved request. Sign in with the email you used, or contact support for help." : mode === 'fresh' ? 'Your previous request was cancelled and its payment session is closed. Start this request over and complete the form again to continue.' : 'We need to confirm the payment status of your previous request. Contact support@instantmed.com.au before starting another payment.',
      ...(mode === 'fresh' ? { requiresFreshRequest: true } : mode === 'sign_in' ? { requiresSignIn: true } : {}),
    }))
  } else if (req.url.startsWith('/api/')) { res.setHeader('content-type', 'application/json'); res.end('{}') }
  else if (/^\/logos\/payment\/[a-z-]+\.svg$/.test(req.url)) {
    res.setHeader('content-type', 'image/svg+xml')
    res.end(await readFile(join(process.cwd(), 'public', req.url)))
  } else if (req.url === '/fixture.js' || req.url === '/fixture.css') {
    res.setHeader('content-type', req.url.endsWith('.css') ? 'text/css' : 'application/javascript')
    res.end(await readFile(join(scratch, req.url.slice(1))))
  } else {
    res.setHeader('content-type', 'text/html')
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body class="bg-background text-foreground"><main id="root" class="max-w-xl mx-auto p-6"></main><script type="module" src="/fixture.js"></script></body></html>')
  }
})
await new Promise((ok, fail) => { server.once('error', fail); server.listen(3060, '127.0.0.1', ok) })
const browser = await chromium.launch()
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    for (const dark of [false, true]) {
      mode = 'fresh'
      const context = await browser.newContext({ viewport, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' })
      const external = []
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (!['localhost', '127.0.0.1'].includes(url.hostname)) { external.push(url.hostname); return route.abort() }
        return route.continue()
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => { errors.push(error.message); process.stderr.write(error.stack + '\n') })
      await page.goto('http://localhost:3060/request?service=prescription')
      if (dark) await page.locator('html').evaluate(element => element.classList.add('dark'))
      const pay = page.locator('[data-intake-primary-action="true"]')
      // The production mobile shell proxies this same underlying action.
      await pay.evaluate(button => button.click())
      const restart = page.getByRole('button', { name: 'Start this request over' })
      await restart.waitFor({ state: 'visible' })
      assert.equal(await pay.isDisabled(), true)
      assert.equal(await pay.getAttribute('data-intake-primary-ready'), 'false')
      const callsBefore = checkoutCalls
      await pay.evaluate(button => button.click())
      assert.equal(checkoutCalls, callsBefore)
      await restart.focus()
      assert.equal(await restart.evaluate(el => el === document.activeElement), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      assert.equal(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true)
      await page.screenshot({ path: join(scratch, `recovery-${viewport.width}-${dark ? 'dark' : 'light'}.png`), fullPage: true })
      await restart.click()
      await page.waitForURL('**/request?service=prescription')
      await page.waitForFunction(() => window.checkoutFixtureStore.getState().flowInstanceId !== '41414141-4141-4141-8141-414141414141')
      const state = await page.evaluate(() => {
        const s = window.checkoutFixtureStore.getState()
        return { flow: s.flowInstanceId, answers: s.answers, consent: s.safetyConfirmed, terms: s.agreedToTerms, accuracy: s.confirmedAccuracy, email: s.email, bearer: localStorage.getItem('instantmed-server-draft-prescription') }
      })
      assert.match(state.flow, /^[0-9a-f-]{36}$/)
      assert.deepEqual(state.answers, {})
      assert.equal(state.consent, false); assert.equal(state.terms, false); assert.equal(state.accuracy, false)
      assert.equal(state.email, '')
      assert.notEqual(state.bearer, '42424242-4242-4242-8242-424242424242')
      mode = 'sign_in'
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
      await page.reload()
      if (dark) await page.locator('html').evaluate(element => element.classList.add('dark'))
      await pay.evaluate(button => button.click())
      const signIn = page.getByRole('link', { name: 'Sign in to continue' })
      await signIn.waitFor({ state: 'visible' })
      assert.equal(await pay.isDisabled(), true)
      assert.equal(await pay.getAttribute('data-intake-primary-ready'), 'false')
      assert.equal(await page.getByRole('button', { name: 'Start this request over' }).count(), 0)
      assert.equal(await page.getByRole('link', { name: 'Contact support', exact: true }).getAttribute('href'), 'mailto:support@instantmed.com.au')
      assert.equal(await signIn.getAttribute('href'), '/sign-in?redirect_url=%2Frequest%3Fservice%3Dprescription')
      assert.equal(await page.getByText("Your card hasn't been charged.", { exact: false }).count(), 0)
      const signInCalls = checkoutCalls
      await pay.evaluate(button => button.click())
      assert.equal(checkoutCalls, signInCalls)
      await signIn.focus()
      assert.equal(await signIn.evaluate(el => el === document.activeElement), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await page.screenshot({ path: join(scratch, `sign-in-${viewport.width}-${dark ? 'dark' : 'light'}.png`), fullPage: true })
      await signIn.click()
      await page.waitForURL('**/sign-in?redirect_url=*')
      // This checks navigation/handoff only. The fixture does not implement
      // the real sign-in page or claim an authenticated service-provider flow.
      assert.deepEqual(errors, []); assert.deepEqual(external, [])
      await context.close()
    }
  }
  mode = 'blocked'
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('http://localhost:3060/request?service=prescription')
  await page.locator('[data-intake-primary-action="true"]').evaluate(button => button.click())
  await page.getByText('We need to confirm the payment status', { exact: false }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Start this request over' }).count(), 0)
  await context.close()
  process.stdout.write(`PASS: real ReviewStep/store; desktop/mobile light/dark, keyboard, disabled stale Pay, deliberate new identity, cleared answers/consent, possession-blocked sign-in/support navigation, unresolved provider state. Screenshots: ${scratch}\n`)
} finally { await browser.close(); await new Promise(ok => server.close(ok)) }
