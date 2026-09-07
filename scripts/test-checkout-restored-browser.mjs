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
let mode = 'fresh_cancelled'
const checkoutCalls = []
const server = createServer(async (req, res) => {
  if (req.url === '/fixture-checkout') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    checkoutCalls.push(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    if (mode === 'exception') { res.statusCode = 503; res.end('Unavailable'); return }
    const responses = {
      fresh_cancelled: { error: 'Your previous request is closed and its payment session has expired. Start this request over and complete the form again to continue.', requiresFreshRequest: true },
      fresh_expired: { error: 'Your previous request is closed and its payment session has expired. Start this request over and complete the form again to continue.', requiresFreshRequest: true },
      sign_in: { error: "We couldn't verify access to this saved request. Sign in with the email you used, or contact support for help.", requiresSignIn: true },
      processing: { error: 'We need to confirm the payment status of your previous request. Contact support before starting another payment.', requiresSupport: true },
      unknown: { error: 'Legacy provider failure. Try again.' },
      mismatch: { error: 'Your saved request is for a different service. Return to it to check its payment status before starting another request.', savedRequestUrl: '/fixture/saved-request' },
      foreign_flow: { error: "We couldn't verify access to the request linked to this browser. Contact support to recover access before starting another payment.", requiresSupport: true },
    }
    const provider = ['processing', 'unknown'].includes(mode)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ success: false, failureCategory: provider ? 'payment_provider' : 'identity_or_session', failureCode: provider ? 'payment_provider' : 'auth_or_session', failureTaxonomyVersion: 'checkout_v2_20260905', ...responses[mode] }))
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
let browser
const readState = page => page.evaluate(() => {
  const s = window.checkoutFixtureStore.getState()
  return { flow: s.flowInstanceId, step: s.currentStepId, answers: s.answers, consent: s.safetyConfirmed, terms: s.agreedToTerms, accuracy: s.confirmedAccuracy, email: s.email, bearer: localStorage.getItem('instantmed-server-draft-prescription') }
})
const originalFlow = '41414141-4141-4141-8141-414141414141'
const originalBearer = '42424242-4242-4242-8242-424242424242'
const modes = ['fresh_cancelled', 'fresh_expired', 'sign_in', 'processing', 'unknown', 'mismatch', 'foreign_flow', 'exception']
let verifiedViews = 0
try {
  browser = await chromium.launch()
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    for (const dark of [false, true]) {
      for (const scenario of modes) {
        mode = scenario
        const context = await browser.newContext({ viewport, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' })
        const external = []
        await context.route('**/*', route => {
          const url = new URL(route.request().url())
          if (!['localhost', '127.0.0.1'].includes(url.hostname)) { external.push(url.hostname); return route.abort() }
          return route.continue()
        })
        if (dark) await context.addInitScript(() => {
          new MutationObserver(() => document.documentElement?.classList.add('dark')).observe(document, { childList: true })
          document.documentElement?.classList.add('dark')
        })
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        page.on('console', message => {
          const expectedUnavailable = scenario === 'exception'
            && message.location().url === 'http://localhost:3060/fixture-checkout'
            && message.text().includes('503')
          if (message.type() === 'error' && !expectedUnavailable) errors.push(message.text())
        })
        await page.goto('http://localhost:3060/request?service=prescription')
        const pay = page.locator('[data-intake-primary-action="true"]')
        await pay.waitFor({ state: 'attached' })
        const initialState = await readState(page)
        const submitAndCheck = async () => {
          // Mobile viewport: invoke the actual primary button that the
          // production mobile shell proxies, without replacing its handler.
          await pay.evaluate(button => button.click())
          await page.locator('[role="alert"]').waitFor({ state: 'visible' })
          assert.equal(await pay.isDisabled(), true, `${mode}: Pay must stop after recovery`)
          assert.equal(await pay.getAttribute('data-intake-primary-ready'), 'false')
          assert.equal(await page.getByText("Your card hasn't been charged.", { exact: false }).count(), 0)
          const calls = checkoutCalls.length
          await pay.evaluate(button => button.click())
          assert.equal(checkoutCalls.length, calls)
          const request = checkoutCalls.at(-1)
          assert.equal(request.flowInstanceId, originalFlow)
          assert.equal(request.serverDraftSessionId, originalBearer)
          assert.equal(request.identity.email, 'fixture@example.test')
          const current = await readState(page)
          assert.deepEqual(current.answers, initialState.answers)
          assert.equal(current.flow, originalFlow); assert.equal(current.bearer, originalBearer)
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
        }
        await submitAndCheck()
        // Actual store navigation unmounts ReviewStep. Recovery is not a
        // persisted client approval: return/reload rechecks the SAME obligation.
        await page.getByRole('button', { name: 'Back', exact: true }).click()
        assert.notEqual((await readState(page)).step, 'review')
        await page.getByRole('button', { name: 'Review saved request' }).click()
        await submitAndCheck()
        await page.reload()
        await pay.waitFor({ state: 'attached' })
        await submitAndCheck()
        const restart = page.getByRole('button', { name: 'Start this request over' })
        const support = page.getByRole('link', { name: 'Contact support', exact: true })
        if (scenario.startsWith('fresh_')) {
          await restart.focus()
          assert.equal(await restart.evaluate(el => el === document.activeElement), true)
        } else {
          assert.equal(await restart.count(), 0)
          assert.equal(await support.getAttribute('href'), 'mailto:support@instantmed.com.au')
          await support.focus()
          assert.equal(await support.evaluate(el => el === document.activeElement), true)
        }
        assert.equal(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true)
        await page.screenshot({ path: join(scratch, `${scenario}-${viewport.width}-${dark ? 'dark' : 'light'}.png`), fullPage: true })
        if (scenario.startsWith('fresh_')) {
          await restart.click()
          await page.waitForFunction(() => window.checkoutFixtureStore?.getState().flowInstanceId && window.checkoutFixtureStore.getState().flowInstanceId !== '41414141-4141-4141-8141-414141414141')
          const fresh = await readState(page)
          assert.match(fresh.flow, /^[0-9a-f-]{36}$/)
          assert.deepEqual(fresh.answers, {})
          assert.equal(fresh.consent, false); assert.equal(fresh.terms, false); assert.equal(fresh.accuracy, false)
          assert.equal(fresh.email, ''); assert.notEqual(fresh.bearer, originalBearer)
          const beforeNewIdentity = checkoutCalls.length
          await page.getByLabel('Fixture email').fill('new-fixture@example.test')
          await page.getByRole('button', { name: 'Review saved request' }).click()
          // The real store prevents skipping a fresh, incomplete form back to
          // payment. New identity is recorded, with no stale clinical answers.
          const newIdentity = await readState(page)
          assert.equal(newIdentity.flow, fresh.flow)
          assert.equal(newIdentity.email, 'new-fixture@example.test')
          assert.deepEqual(newIdentity.answers, {})
          assert.equal(newIdentity.consent, false)
          assert.notEqual(newIdentity.step, 'review')
          assert.equal(await pay.count(), 0)
          assert.equal(checkoutCalls.length, beforeNewIdentity)
        } else if (scenario === 'mismatch') {
          const saved = page.getByRole('link', { name: 'Return to saved request' })
          assert.equal(await saved.getAttribute('href'), '/fixture/saved-request')
          assert.equal(await page.getByRole('link', { name: 'Sign in to continue', exact: false }).count(), 0)
          await saved.click()
          await page.waitForURL('**/fixture/saved-request')
          await page.getByText('Fixture destination reached').waitFor()
          assert.equal((await readState(page)).flow, originalFlow)
        } else if (scenario === 'sign_in') {
          const signIn = page.getByRole('link', { name: 'Sign in to continue', exact: false })
          assert.equal(await signIn.getAttribute('href'), '/sign-in?redirect_url=%2Frequest%3Fservice%3Dprescription')
          await signIn.click()
          await page.waitForURL('**/sign-in?redirect_url=*')
        }
        assert.deepEqual(errors, []); assert.deepEqual(external, [])
        verifiedViews++
        await context.close()
      }
    }
  }
  process.stdout.write(`PASS: ${verifiedViews} real ReviewStep/store views; desktop/mobile light/dark, reduced motion, keyboard, Back/remount/reload with same flow/bearer, disabled stale Pay, explicit fresh identity and consent, ownership/service recovery and unknown provider state. External requests: 0. Screenshots: ${scratch}\n`)
} finally { await browser?.close(); await new Promise(ok => server.close(ok)) }
