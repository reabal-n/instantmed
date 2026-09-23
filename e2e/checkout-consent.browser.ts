import { gunzipSync } from 'node:zlib'

import { expect, test } from '@playwright/test'

import { TELEHEALTH_CONSENT_VERSION } from '@/lib/constants'

test('enlarged consent remains measurable on a short mobile screen', async ({ page }, testInfo) => {
  const events: { event: string }[] = []
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort()
    if (url.pathname.startsWith('/ingest/')) {
      if (url.pathname.endsWith('.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      if (url.pathname.endsWith('/e/')) {
        const body = request.postDataBuffer()
        if (body) {
          const raw = url.searchParams.get('compression') === 'gzip-js' ? gunzipSync(body).toString() : body.toString()
          const payload = JSON.parse(raw)
          events.push(...(Array.isArray(payload) ? payload : [payload]))
        }
      }
      return route.fulfill({ status: 200, json: { status: 1, featureFlags: {}, supportedCompression: [] } })
    }
    if (url.pathname.startsWith('/api/draft')) return route.fulfill({ status: 404, json: {} })
    if (request.headers()['next-action']) return route.abort()
    return route.continue()
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined })
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '32px' })
    localStorage.setItem('instantmed-draft-med-cert', JSON.stringify({
      serviceType: 'med-cert', flowInstanceId: crypto.randomUUID(), currentStepId: 'checkout', furthestVisitedStepId: 'checkout',
      answers: { certType: 'work', startDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()), duration: '1', symptomDetails: 'Synthetic local fixture only.' },
      firstName: 'Test', lastName: 'Patient', email: 'checkout-probe@example.com', dob: '1990-01-01',
      safetyConfirmed: false, lastSavedAt: new Date().toISOString(),
    }))
  })
  await page.goto('/request?service=med-cert')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review & pay')
  await page.locator('[data-intake-mobile-action-bar="true"]').getByRole('button', { name: 'Review & confirm' }).tap()
  const consent = page.getByRole('checkbox', { name: /Confirm request and payment terms/i })
  await expect(consent).toBeFocused()
  await expect(consent).not.toBeChecked()
  const label = page.locator('label').filter({ has: consent })
  await expect.poll(() => label.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: testInfo.outputPath('enlarged-consent.png') })
  await expect.poll(() => events.filter(event => event.event === 'checkout_review_confirm_clicked').length, { timeout: 15000 }).toBe(1)
  await expect.poll(() => events.filter(event => event.event === 'checkout_consent_viewed').length, { timeout: 15000 }).toBe(1)
  await consent.tap()
  await expect(consent).toBeChecked()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px' })
  await consent.scrollIntoViewIfNeeded()
  await expect(consent).toBeChecked()
  await expect.poll(() => label.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'Pay $24.95', exact: true })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('desktop-consent.png') })
  expect(events.filter(event => event.event === 'checkout_consent_viewed')).toHaveLength(1)
})

for (const mode of ['light', 'dark'] as const) {
  for (const savedVersion of ['legacy', 'current'] as const) {
    test(`${mode} ${savedVersion}: restored mobile consent, answer edit, reconfirm and payment attempt`, async ({ page }, testInfo) => {
      let paymentAttempts = 0
      const events: { event: string; properties: Record<string, unknown> }[] = []
      const failures: string[] = []
      page.on('pageerror', error => failures.push(error.message))
      await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' })
      await page.route('**/*', async route => {
        const request = route.request()
        if (!['localhost', '127.0.0.1'].includes(new URL(request.url()).hostname)) return route.abort()
        if (request.url().includes('/ingest/')) {
          if (new URL(request.url()).pathname.endsWith('.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
          if (new URL(request.url()).pathname.endsWith('/e/')) {
            const body = request.postDataBuffer()
            if (body) {
              const raw = new URL(request.url()).searchParams.get('compression') === 'gzip-js' ? gunzipSync(body).toString() : body.toString()
              const payload = JSON.parse(raw)
              events.push(...(Array.isArray(payload) ? payload : [payload]))
            }
          }
          return route.fulfill({ status: 200, json: { status: 1, featureFlags: {}, supportedCompression: [] } })
        }
        if (request.url().includes('/api/draft')) return route.fulfill({ status: 404, json: { error: 'Not found' } })
        if (request.headers()['next-action']) { paymentAttempts++; return route.abort('connectionfailed') }
        return route.continue()
      })
      await page.addInitScript(() => {
        // Exercise the real SDK in this fully intercepted local test; otherwise
        // its bot filter drops Playwright events before the transport.
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
        Object.defineProperty(navigator, 'userAgentData', { get: () => undefined })
      })
      await page.addInitScript(({ mode }) => localStorage.setItem('theme', mode), { mode })
      await page.addInitScript(({ version }) => {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date())
        localStorage.setItem('instantmed-draft-med-cert', JSON.stringify({
          serviceType: 'med-cert', flowInstanceId: crypto.randomUUID(), currentStepId: 'checkout', furthestVisitedStepId: 'checkout',
          answers: { certType: 'work', startDate: today, duration: '1', symptomDetails: 'Runny nose and a mild headache since this morning.', telehealthConsentVersion: version },
          firstName: 'Test', lastName: 'Patient', email: 'checkout-probe@example.com', dob: '1990-01-01',
          safetyConfirmed: true, safetyTimestamp: new Date().toISOString(), lastSavedAt: new Date().toISOString(),
        }))
        localStorage.removeItem('instantmed-request-draft')
      }, { version: savedVersion === 'current' ? TELEHEALTH_CONSENT_VERSION : '2026-02' })
      await page.goto('/request?service=med-cert')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review & pay')
      const consent = page.getByRole('checkbox', { name: /Confirm request and payment terms/i })
      const bar = page.locator('[data-intake-mobile-action-bar="true"]')
      if (savedVersion === 'legacy') {
        await expect(consent).not.toBeChecked()
        await bar.getByRole('button', { name: 'Review & confirm' }).tap()
        await expect(consent).toBeFocused()
        expect(paymentAttempts).toBe(0)
        await consent.tap()
      } else await expect(consent).toBeChecked()
      await expect(bar.getByRole('button', { name: /Pay \$24\.95/ })).toBeEnabled()
      await page.getByRole('button', { name: 'Edit Symptoms', exact: true }).tap()
      await page.locator('#symptom-details').fill('Runny nose and a mild headache since yesterday. I need rest.')
      await bar.getByRole('button', { name: /^Continue/ }).tap()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your details')
      await bar.getByRole('button', { name: /^Continue/ }).tap()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review & pay')
      await expect(consent).not.toBeChecked()
      await bar.getByRole('button', { name: 'Review & confirm' }).tap()
      await expect(consent).toBeFocused()
      await consent.tap()
      await expect(consent).toBeChecked()
      await expect(bar.getByRole('button', { name: /Pay \$24\.95/ })).toBeEnabled()
      await page.screenshot({ path: testInfo.outputPath('reconfirmed.png'), fullPage: true })
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
      await bar.getByRole('button', { name: /Pay \$24\.95/ }).tap()
      await expect(page.getByRole('alert').filter({ hasText: /couldn't confirm the checkout result/i })).toBeVisible()
      expect(paymentAttempts).toBe(1)
      await expect.poll(() => events.filter(event => event.event === 'checkout_review_confirm_clicked').length, { timeout: 15000 }).toBeGreaterThan(0)
      await expect.poll(() => events.filter(event => event.event === 'checkout_consent_viewed').length).toBeGreaterThan(0)
      await expect.poll(() => events.filter(event => event.event === 'checkout_consent_state' && event.properties.consent_checked === true).length).toBeGreaterThan(0)
      const consentEvents = events.filter(event => event.properties.telemetry_version === 'checkout-consent-v2')
      expect(consentEvents.every(event => typeof event.properties.flow_instance_id === 'string')).toBe(true)
      expect(JSON.stringify(consentEvents)).not.toMatch(/checkout-probe@example|Runny nose|Test Patient|1990-01-01/)

      await expect(bar.getByRole('button', { name: /Pay \$24\.95/ })).toBeDisabled()
      expect(failures).toEqual([])
    })
  }
}

test('fresh certificate: defaults are not interactions and Continue records the tap before progression', async ({ page }) => {
  const events: { event: string; properties: Record<string, unknown> }[] = []
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort()
    if (url.pathname.startsWith('/ingest/')) {
      if (url.pathname.endsWith('.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      if (url.pathname.endsWith('/e/')) {
        const body = request.postDataBuffer()
        if (body) {
          const raw = url.searchParams.get('compression') === 'gzip-js' ? gunzipSync(body).toString() : body.toString()
          const payload = JSON.parse(raw)
          events.push(...(Array.isArray(payload) ? payload : [payload]))
        }
      }
      return route.fulfill({ status: 200, json: { status: 1, featureFlags: {}, supportedCompression: [] } })
    }
    if (url.pathname.startsWith('/api/draft')) return route.fulfill({ status: 404, json: {} })
    if (request.headers()['next-action']) return route.abort()
    return route.continue()
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined })
  })
  await page.goto('/request?service=med-cert')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Certificate details')
  await page.locator('[data-intake-mobile-action-bar="true"]').getByRole('button', { name: /^Continue/ }).tap()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your symptoms')
  await expect.poll(() => events.filter(e => e.event === 'certificate_continue_clicked').length, { timeout: 15000 }).toBe(1)
  expect(events.filter(e => e.event === 'intake_answer_changed' && e.properties.step_id === 'certificate')).toEqual([])
  const tap = events.find(e => e.event === 'certificate_continue_clicked')!
  expect(tap.properties.service_type).toBe('med-cert')
  expect(tap.properties.step_id).toBe('certificate')
  expect(tap.properties.flow_instance_id).toMatch(/^[\da-f-]{36}$/)
})
