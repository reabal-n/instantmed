import type { Page, Route } from "@playwright/test"

const SYNTHETIC_DRAFT_ID = "00000000-0000-4000-8000-000000000001"
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

type SyntheticDraft = {
  answers: Record<string, unknown>
  currentStepId: string | null
  identity: {
    dob: string | null
    email: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
  }
  serviceType: "med-cert" | "prescription" | "consult"
}

const emptyDraft = (): SyntheticDraft => ({
  answers: {},
  currentStepId: null,
  identity: {
    dob: null,
    email: null,
    firstName: null,
    lastName: null,
    phone: null,
  },
  serviceType: "med-cert",
})

async function fulfillJson(route: Route, status: number, payload: unknown) {
  await route.fulfill({
    body: JSON.stringify(payload),
    contentType: "application/json",
    headers: {
      "Cache-Control": "private, no-store",
    },
    status,
  })
}

/**
 * The production request-flow synthetic verifies rendering and interaction,
 * not persistence or analytics delivery. Keep every side effect inside the
 * browser so scheduled checks cannot create recoverable drafts, emails, or
 * funnel events in production.
 */
export async function installProductionSyntheticIsolation(page: Page) {
  let draft = emptyDraft()

  await page.route("**/api/draft**", async (route) => {
    const request = route.request()
    const method = request.method()
    const now = new Date()

    if (method === "DELETE") {
      draft = emptyDraft()
      await fulfillJson(route, 200, { ok: true })
      return
    }

    if (method === "GET") {
      await fulfillJson(route, 200, {
        ...draft,
        expiresAt: new Date(now.getTime() + DRAFT_TTL_MS).toISOString(),
        sessionId: SYNTHETIC_DRAFT_ID,
        updatedAt: now.toISOString(),
      })
      return
    }

    if (method === "POST") {
      const payload = request.postDataJSON() as Partial<{
        answers: Record<string, unknown>
        currentStepId: string
        identity: Partial<SyntheticDraft["identity"]>
        serviceType: SyntheticDraft["serviceType"]
      }>

      draft = {
        answers: payload.answers ?? {},
        currentStepId: payload.currentStepId ?? null,
        identity: {
          ...emptyDraft().identity,
          ...payload.identity,
        },
        serviceType: payload.serviceType ?? draft.serviceType,
      }

      await fulfillJson(route, 200, {
        expiresAt: new Date(now.getTime() + DRAFT_TTL_MS).toISOString(),
        sessionId: SYNTHETIC_DRAFT_ID,
        updatedAt: now.toISOString(),
      })
      return
    }

    await fulfillJson(route, 405, { error: "Method not allowed" })
  })

  // PostHog is reverse-proxied through /ingest. Returning a local no-op keeps
  // synthetic clicks out of production funnels without changing app runtime.
  await page.route("**/ingest/**", async (route) => {
    await fulfillJson(route, 200, {})
  })
}
