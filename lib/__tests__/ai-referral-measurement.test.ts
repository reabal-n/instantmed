import { afterEach, describe, expect, it, vi } from "vitest"

type StorageState = Record<string, string>

type FakePostHog = {
  __loaded: boolean
  capture: ReturnType<typeof vi.fn>
  get_session_id: ReturnType<typeof vi.fn>
  has_opted_out_capturing?: ReturnType<typeof vi.fn>
  init: ReturnType<typeof vi.fn>
  register: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
}

function createStorage(
  state: StorageState,
  { denied = false }: { denied?: boolean } = {},
) {
  return {
    getItem(key: string) {
      if (denied) throw new Error("storage denied")
      return state[key] ?? null
    },
    removeItem(key: string) {
      if (denied) throw new Error("storage denied")
      delete state[key]
    },
    setItem(key: string, value: string) {
      if (denied) throw new Error("storage denied")
      state[key] = value
    },
  }
}

function setBrowser({
  pathname = "/medical-certificate-online",
  search = "?utm_source=chatgpt.com",
  referrer = "",
  sessionStorage = createStorage({}),
  localStorage = createStorage({}),
}: {
  pathname?: string
  search?: string
  referrer?: string
  sessionStorage?: ReturnType<typeof createStorage>
  localStorage?: ReturnType<typeof createStorage>
} = {}) {
  const location = {
    origin: "http://localhost:3060",
    pathname,
    protocol: "http:",
    search,
  }

  vi.stubGlobal("window", { location, localStorage, sessionStorage })
  vi.stubGlobal("document", { cookie: "", referrer })
  vi.stubGlobal("localStorage", localStorage)
  vi.stubGlobal("sessionStorage", sessionStorage)
  return location
}

function createPostHog(sessionId = "019f0000-0000-7000-8000-000000000001"): FakePostHog {
  const client = {
    __loaded: true,
    capture: vi.fn(),
    get_session_id: vi.fn(() => sessionId),
    init: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
  } satisfies FakePostHog

  client.init.mockImplementation(() => {
    client.__loaded = true
    return client
  })
  return client
}

async function flushDynamicImports() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function importInstrumentation(posthog: FakePostHog) {
  const firstInteractionCallbacks: Array<() => void> = []
  const sentryInit = vi.fn()

  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_synthetic_test_key")
  vi.stubEnv("NEXT_PUBLIC_PLAYWRIGHT", "0")
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://synthetic@example.invalid/1")
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production")
  vi.doMock("posthog-js", () => ({ default: posthog, posthog }))
  vi.doMock("@sentry/nextjs", () => ({
    captureRouterTransitionStart: vi.fn(),
    init: sentryInit,
  }))
  vi.doMock("@/lib/browser/first-interaction", () => ({
    onFirstInteraction: (callback: () => void) => {
      firstInteractionCallbacks.push(callback)
      return vi.fn()
    },
  }))

  await import("../../instrumentation-client")
  await flushDynamicImports()

  return { firstInteractionCallbacks, sentryInit }
}

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.doUnmock("posthog-js")
  vi.doUnmock("@sentry/nextjs")
  vi.doUnmock("@/lib/browser/first-interaction")
})

describe("AI referral startup", () => {
  it("initializes PostHog and records an exact AI UTM arrival without interaction", async () => {
    setBrowser()
    const posthog = createPostHog()

    const { firstInteractionCallbacks, sentryInit } = await importInstrumentation(posthog)

    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.capture).toHaveBeenCalledWith("ai_referral", {
      ai_source: "ChatGPT",
      landing_page: "/medical-certificate-online",
      matched_by: "utm_source",
    }, { send_instantly: true })
    expect(sentryInit).not.toHaveBeenCalled()
    expect(firstInteractionCallbacks).toHaveLength(1)
  })

  it("keeps ordinary acquisition and Sentry deferred until interaction", async () => {
    setBrowser({ search: "?utm_source=newsletter", referrer: "https://example.com/article" })
    const posthog = createPostHog()

    const { firstInteractionCallbacks, sentryInit } = await importInstrumentation(posthog)

    expect(posthog.init).not.toHaveBeenCalled()
    expect(sentryInit).not.toHaveBeenCalled()
    expect(firstInteractionCallbacks).toHaveLength(2)

    for (const callback of firstInteractionCallbacks) callback()
    await flushDynamicImports()

    expect(posthog.init).toHaveBeenCalledTimes(1)
    expect(posthog.capture).not.toHaveBeenCalledWith(
      "ai_referral",
      expect.anything(),
      expect.anything(),
    )
    expect(posthog.get_session_id).not.toHaveBeenCalled()
    expect(sentryInit).toHaveBeenCalledTimes(1)
  })

  it("does not eagerly initialize for a lookalike AI host", async () => {
    setBrowser({
      search: "",
      referrer: "https://chatgpt.com.evil.example/private-thread",
    })
    const posthog = createPostHog()

    const { firstInteractionCallbacks } = await importInstrumentation(posthog)

    expect(posthog.init).not.toHaveBeenCalled()
    expect(firstInteractionCallbacks).toHaveLength(2)
  })

  it("does not initialize external analytics on a private path", async () => {
    setBrowser({ pathname: "/patient/intakes/private", referrer: "https://chatgpt.com/" })
    const posthog = createPostHog()

    await importInstrumentation(posthog)

    expect(posthog.init).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.get_session_id).not.toHaveBeenCalled()
  })
})

describe("AI referral session deduplication", () => {
  it("records one first landing after a module reload in the same SDK session", async () => {
    const sessionState: StorageState = {}
    const location = setBrowser({ sessionStorage: createStorage(sessionState) })
    const posthog = createPostHog()
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))

    const firstModule = await import("@/lib/analytics/ai-referral")
    firstModule.trackAIReferral()
    await flushDynamicImports()

    location.pathname = "/prescriptions"
    vi.resetModules()
    const reloadedModule = await import("@/lib/analytics/ai-referral")
    reloadedModule.trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).toHaveBeenCalledTimes(1)
    expect(posthog.capture).toHaveBeenCalledWith("ai_referral", {
      ai_source: "ChatGPT",
      landing_page: "/medical-certificate-online",
      matched_by: "utm_source",
    }, { send_instantly: true })
  })

  it("records a new referral when the SDK starts a new session", async () => {
    const sessionState: StorageState = {}
    const location = setBrowser({ sessionStorage: createStorage(sessionState) })
    const posthog = createPostHog()
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))
    const { trackAIReferral } = await import("@/lib/analytics/ai-referral")

    trackAIReferral()
    await flushDynamicImports()
    posthog.get_session_id.mockReturnValue("019f0000-0000-7000-8000-000000000002")
    location.pathname = "/prescriptions"
    trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).toHaveBeenCalledTimes(2)
    expect(posthog.capture).toHaveBeenLastCalledWith("ai_referral", {
      ai_source: "ChatGPT",
      landing_page: "/prescriptions",
      matched_by: "utm_source",
    }, { send_instantly: true })
  })

  it("falls back safely when sessionStorage is denied", async () => {
    const localState: StorageState = {}
    setBrowser({
      sessionStorage: createStorage({}, { denied: true }),
      localStorage: createStorage(localState),
    })
    const posthog = createPostHog()
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))

    const firstModule = await import("@/lib/analytics/ai-referral")
    firstModule.trackAIReferral()
    await flushDynamicImports()
    vi.resetModules()
    const reloadedModule = await import("@/lib/analytics/ai-referral")
    reloadedModule.trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).toHaveBeenCalledTimes(1)
  })

  it("deduplicates the same SDK session across tabs", async () => {
    const localState: StorageState = {}
    setBrowser({
      sessionStorage: createStorage({}),
      localStorage: createStorage(localState),
    })
    const posthog = createPostHog()
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))

    const firstTabModule = await import("@/lib/analytics/ai-referral")
    firstTabModule.trackAIReferral()
    await flushDynamicImports()

    vi.resetModules()
    setBrowser({
      sessionStorage: createStorage({}),
      localStorage: createStorage(localState),
    })
    const secondTabModule = await import("@/lib/analytics/ai-referral")
    secondTabModule.trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).toHaveBeenCalledTimes(1)
  })

  it("resolves a stale nested singleton wrapper before capture", async () => {
    setBrowser()
    const posthog = createPostHog()
    vi.doMock("posthog-js", () => ({
      default: { __loaded: false },
      posthog,
    }))
    const { trackAIReferral } = await import("@/lib/analytics/ai-referral")

    trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).toHaveBeenCalledTimes(1)
  })

  it("does not rewrite existing revenue attribution storage", async () => {
    const sessionState = {
      instantmed_attribution: JSON.stringify({
        landing_page: "/",
        referrer: "https://www.google.com",
        captured_at: "2026-09-09T00:00:00.000Z",
      }),
    }
    setBrowser({ sessionStorage: createStorage(sessionState) })
    const posthog = createPostHog()
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))
    const { trackAIReferral } = await import("@/lib/analytics/ai-referral")

    trackAIReferral()
    await flushDynamicImports()

    expect(JSON.parse(sessionState.instantmed_attribution)).toEqual({
      landing_page: "/",
      referrer: "https://www.google.com",
      captured_at: "2026-09-09T00:00:00.000Z",
    })
  })

  it("respects an existing PostHog capture opt-out", async () => {
    setBrowser()
    const posthog = createPostHog()
    posthog.has_opted_out_capturing = vi.fn(() => true)
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))
    const { trackAIReferral } = await import("@/lib/analytics/ai-referral")

    trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.get_session_id).not.toHaveBeenCalled()
  })
})
