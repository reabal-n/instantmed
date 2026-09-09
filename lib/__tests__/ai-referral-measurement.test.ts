import { SessionIdManager } from "posthog-js/lib/src/sessionid"
import { afterEach, describe, expect, it, vi } from "vitest"

type StorageState = Record<string, string>

const DELAYED_AI_SOURCE_CASES = [
  {
    label: "UTM",
    matchedBy: "utm_source",
    referrer: "",
    search: "?utm_source=chatgpt.com",
  },
  {
    label: "referrer",
    matchedBy: "referrer",
    referrer: "https://chatgpt.com/answer",
    search: "",
  },
] as const

type FakePostHog = {
  __loaded: boolean
  capture: ReturnType<typeof vi.fn>
  get_session_id: ReturnType<typeof vi.fn>
  has_opted_out_capturing?: ReturnType<typeof vi.fn>
  init: ReturnType<typeof vi.fn>
  register: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
  sessionManager: {
    checkAndGetSessionAndWindowId: ReturnType<typeof vi.fn>
  }
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

function createCookieDocument(
  state: StorageState,
  { denied = false }: { denied?: boolean } = {},
) {
  const cookieDocument = { referrer: "" }

  Object.defineProperty(cookieDocument, "cookie", {
    configurable: true,
    get() {
      if (denied) return ""
      return Object.entries(state).map(([key, value]) => `${key}=${value}`).join("; ")
    },
    set(serialized: string) {
      if (denied) return
      const [pair] = serialized.split(";", 1)
      const separator = pair.indexOf("=")
      if (separator < 0) return
      const key = pair.slice(0, separator)
      const value = pair.slice(separator + 1)
      if (/max-age=0(?:;|$)/i.test(serialized)) {
        delete state[key]
      } else {
        state[key] = value
      }
    },
  })

  return cookieDocument
}

function setBrowser({
  pathname = "/medical-certificate-online",
  search = "?utm_source=chatgpt.com",
  referrer = "",
  sessionStorage = createStorage({}),
  localStorage = createStorage({}),
  cookieDocument = createCookieDocument({}),
}: {
  pathname?: string
  search?: string
  referrer?: string
  sessionStorage?: ReturnType<typeof createStorage>
  localStorage?: ReturnType<typeof createStorage>
  cookieDocument?: ReturnType<typeof createCookieDocument>
} = {}) {
  const location = {
    origin: "http://localhost:3060",
    pathname,
    protocol: "http:",
    search,
  }

  vi.stubGlobal("window", { location, localStorage, sessionStorage })
  cookieDocument.referrer = referrer
  vi.stubGlobal("document", cookieDocument)
  vi.stubGlobal("localStorage", localStorage)
  vi.stubGlobal("sessionStorage", sessionStorage)
  return location
}

function createPostHog(sessionId = "019f0000-0000-7000-8000-000000000001"): FakePostHog {
  const getSessionId = vi.fn(() => sessionId)
  const sessionManager = {
    checkAndGetSessionAndWindowId: vi.fn(() => ({ sessionId: getSessionId() })),
  }
  const client = {
    __loaded: true,
    capture: vi.fn((event: string, properties?: Record<string, unknown>) => ({
      event,
      properties: {
        ...properties,
        $session_id: sessionManager.checkAndGetSessionAndWindowId().sessionId,
      },
    })),
    get_session_id: getSessionId,
    init: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
    sessionManager,
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

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function importInstrumentation(
  posthog: FakePostHog,
  { posthogImportGate }: { posthogImportGate?: Promise<void> } = {},
) {
  const firstInteractionCallbacks: Array<() => void> = []
  const sentryInit = vi.fn()

  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_synthetic_test_key")
  vi.stubEnv("NEXT_PUBLIC_PLAYWRIGHT", "0")
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://synthetic@example.invalid/1")
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production")
  vi.doMock("posthog-js", async () => {
    await posthogImportGate
    return { default: posthog, posthog }
  })
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
  if (!posthogImportGate) await flushDynamicImports()

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
    expect(posthog.sessionManager.checkAndGetSessionAndWindowId).not.toHaveBeenCalled()
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
    expect(posthog.sessionManager.checkAndGetSessionAndWindowId).not.toHaveBeenCalled()
  })

  it.each(DELAYED_AI_SOURCE_CASES)(
    "keeps the original $label landing while instrumentation waits for the SDK",
    async ({ matchedBy, referrer, search }) => {
      const location = setBrowser({
        pathname: "/compare/online-medical-certificate-options",
        referrer,
        search,
      })
      const posthog = createPostHog()
      const sdkImport = createDeferred()

      await importInstrumentation(posthog, { posthogImportGate: sdkImport.promise })
      location.pathname = "/medical-certificate-online"
      location.search = ""
      sdkImport.resolve()
      await flushDynamicImports()
      await flushDynamicImports()

      expect(posthog.capture).toHaveBeenCalledWith("ai_referral", {
        ai_source: "ChatGPT",
        landing_page: "/compare/online-medical-certificate-options",
        matched_by: matchedBy,
      }, { send_instantly: true })
    },
  )

  it("does not initialize after a delayed AI landing navigates to a private route", async () => {
    const location = setBrowser({
      pathname: "/compare/online-medical-certificate-options",
      search: "?utm_source=chatgpt.com",
    })
    const posthog = createPostHog()
    const sdkImport = createDeferred()

    await importInstrumentation(posthog, { posthogImportGate: sdkImport.promise })
    location.pathname = "/patient/intakes/private"
    location.search = ""
    sdkImport.resolve()
    await flushDynamicImports()
    await flushDynamicImports()

    expect(posthog.init).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.sessionManager.checkAndGetSessionAndWindowId).not.toHaveBeenCalled()
  })
})

describe("AI referral immutable landing snapshot", () => {
  it.each(DELAYED_AI_SOURCE_CASES)(
    "keeps the original $label landing through the provider import path",
    async ({ matchedBy, referrer, search }) => {
      const location = setBrowser({
        pathname: "/compare/online-medical-certificate-options",
        referrer,
        search,
      })
      const posthog = createPostHog()
      const sdkImport = createDeferred()
      vi.doMock("posthog-js", async () => {
        await sdkImport.promise
        return { default: posthog, posthog }
      })
      const { trackAIReferral } = await import("@/lib/analytics/ai-referral")

      trackAIReferral()
      location.pathname = "/medical-certificate-online"
      location.search = ""
      sdkImport.resolve()
      await flushDynamicImports()
      await flushDynamicImports()

      expect(posthog.capture).toHaveBeenCalledWith("ai_referral", {
        ai_source: "ChatGPT",
        landing_page: "/compare/online-medical-certificate-options",
        matched_by: matchedBy,
      }, { send_instantly: true })
    },
  )

  it("drops a delayed public referral after navigation to a private route", async () => {
    const location = setBrowser({
      pathname: "/compare/online-medical-certificate-options",
      search: "?utm_source=chatgpt.com",
    })
    const posthog = createPostHog()
    const sdkImport = createDeferred()
    vi.doMock("posthog-js", async () => {
      await sdkImport.promise
      return { default: posthog, posthog }
    })
    const { trackAIReferral } = await import("@/lib/analytics/ai-referral")

    trackAIReferral()
    location.pathname = "/patient/intakes/private"
    location.search = ""
    sdkImport.resolve()
    await flushDynamicImports()
    await flushDynamicImports()

    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.sessionManager.checkAndGetSessionAndWindowId).not.toHaveBeenCalled()
  })
})

describe("AI referral session deduplication", () => {
  it("rotates an expired persisted SDK session before applying dedupe", async () => {
    const now = Date.now()
    const staleSessionId = "019f0000-0000-7000-8000-000000000010"
    const activeSessionId = "019f0000-0000-7000-8000-000000000011"
    const persistence = {
      _disabled: false,
      props: {
        $sesid: [now - 61_000, staleSessionId, now - 61_000],
      } as Record<string, unknown>,
      register(values: Record<string, unknown>) {
        Object.assign(this.props, values)
      },
    }
    const sdkSessionManager = new SessionIdManager({
      config: {
        persistence: "memory",
        persistence_name: "ai-referral-test",
        session_idle_timeout_seconds: 60,
        token: "synthetic",
      },
      persistence,
      register: vi.fn(),
    } as never, () => activeSessionId, () => "019f0000-0000-7000-8000-000000000012")
    const localState: StorageState = {
      instantmed_ai_referral_session_fallback_v1: JSON.stringify({
        expiresAt: now + 60_000,
        sessionId: staleSessionId,
      }),
    }
    setBrowser({ localStorage: createStorage(localState) })
    const posthog = createPostHog()
    posthog.get_session_id.mockImplementation(
      () => sdkSessionManager.checkAndGetSessionAndWindowId(true).sessionId,
    )
    posthog.sessionManager.checkAndGetSessionAndWindowId.mockImplementation(
      (readOnly?: boolean) => sdkSessionManager.checkAndGetSessionAndWindowId(readOnly),
    )
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))

    try {
      const { trackAIReferral } = await import("@/lib/analytics/ai-referral")
      trackAIReferral()
      await flushDynamicImports()

      expect(posthog.capture).toHaveBeenCalledTimes(1)
      expect(JSON.parse(localState.instantmed_ai_referral_session_fallback_v1)).toMatchObject({
        sessionId: activeSessionId,
      })
    } finally {
      sdkSessionManager.destroy()
    }
  })

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

  it("uses a bounded cookie marker when both Web Storage APIs are denied", async () => {
    const cookieState: StorageState = {}
    const setDeniedStorageBrowser = () => setBrowser({
      sessionStorage: createStorage({}, { denied: true }),
      localStorage: createStorage({}, { denied: true }),
      cookieDocument: createCookieDocument(cookieState),
    })
    setDeniedStorageBrowser()
    const posthog = createPostHog()
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))

    const firstModule = await import("@/lib/analytics/ai-referral")
    firstModule.trackAIReferral()
    await flushDynamicImports()
    vi.resetModules()
    setDeniedStorageBrowser()
    const reloadedModule = await import("@/lib/analytics/ai-referral")
    reloadedModule.trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).toHaveBeenCalledTimes(1)
    expect(cookieState).toHaveProperty("instantmed_ai_referral_session_cookie_v1")
    const cookieMarker = JSON.parse(decodeURIComponent(
      cookieState.instantmed_ai_referral_session_cookie_v1,
    )) as { expiresAt: number; sessionId: string }
    expect(cookieMarker).toMatchObject({
      sessionId: "019f0000-0000-7000-8000-000000000001",
    })
    expect(cookieMarker.expiresAt).toBeGreaterThan(Date.now())
    expect(cookieMarker.expiresAt).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000)
  })

  it("fails closed when no cross-tab marker store is available", async () => {
    setBrowser({
      sessionStorage: createStorage({}, { denied: true }),
      localStorage: createStorage({}, { denied: true }),
      cookieDocument: createCookieDocument({}, { denied: true }),
    })
    const posthog = createPostHog()
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))
    const { trackAIReferral } = await import("@/lib/analytics/ai-referral")

    trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.sessionManager.checkAndGetSessionAndWindowId).not.toHaveBeenCalled()
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

  it("marks only an event accepted by the SDK", async () => {
    const localState: StorageState = {}
    setBrowser({ localStorage: createStorage(localState) })
    const posthog = createPostHog()
    posthog.capture.mockReturnValueOnce(undefined)
    vi.doMock("posthog-js", () => ({ default: posthog, posthog }))

    const droppedModule = await import("@/lib/analytics/ai-referral")
    droppedModule.trackAIReferral()
    await flushDynamicImports()
    expect(localState).not.toHaveProperty("instantmed_ai_referral_session_fallback_v1")

    vi.resetModules()
    const acceptedModule = await import("@/lib/analytics/ai-referral")
    acceptedModule.trackAIReferral()
    await flushDynamicImports()

    vi.resetModules()
    const dedupedModule = await import("@/lib/analytics/ai-referral")
    dedupedModule.trackAIReferral()
    await flushDynamicImports()

    expect(posthog.capture).toHaveBeenCalledTimes(2)
    expect(localState).toHaveProperty("instantmed_ai_referral_session_fallback_v1")
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
    expect(posthog.sessionManager.checkAndGetSessionAndWindowId).not.toHaveBeenCalled()
  })
})
