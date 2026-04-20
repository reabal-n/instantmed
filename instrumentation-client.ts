// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { scrubPHI, scrubPHIFromObject } from "@/lib/observability/scrub-phi";

// Sentry module reference — populated after lazy load.
// Exported as a function ref so Next.js router can capture transitions even if
// Sentry hasn't finished loading when the first navigation fires.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sentryCapture: ((...args: any[]) => void) | null = null;

export function onRouterTransitionStart(...args: unknown[]) {
  _sentryCapture?.(...args);
}

/**
 * Client-side Sentry environment detection
 * Mirrors server-side logic for consistency
 */
function getClientSentryEnvironment(): "production" | "preview" | "development" | "e2e" {
  const isPlaywright = process.env.NEXT_PUBLIC_PLAYWRIGHT === "1"
  if (isPlaywright) return "e2e"

  // Vercel injects NEXT_PUBLIC_VERCEL_ENV at build time
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
  if (vercelEnv === "production") return "production"
  if (vercelEnv === "preview") return "preview"
  if (vercelEnv === "development") return "development"

  if (process.env.NODE_ENV === "production") return "production"
  return "development"
}

function getClientSentryRelease(): string | undefined {
  // Vercel injects NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA at build time
  return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined
}

// Get configuration
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const sentryEnvironment = getClientSentryEnvironment()
const sentryRelease = getClientSentryRelease()
const sentryEnabled = sentryEnvironment === "production" || sentryEnvironment === "preview" || sentryEnvironment === "e2e"
const isPlaywrightMode = sentryEnvironment === "e2e"

if (!sentryDsn && sentryEnabled) {
  // eslint-disable-next-line no-console
  console.warn("[Sentry] NEXT_PUBLIC_SENTRY_DSN not configured - error tracking disabled");
}

// Defer Sentry init until after page is interactive to avoid blocking LCP/TBT.
// @sentry/nextjs is ~150KB gzipped — keeping it off the critical path saves
// ~400–600ms of parse/compile time on simulated mobile (PSI conditions).
async function loadAndInitSentry() {
  const Sentry = await import("@sentry/nextjs");

  _sentryCapture = Sentry.captureRouterTransitionStart;

  Sentry.init({
    dsn: sentryDsn,
    enabled: sentryEnabled,
    environment: sentryEnvironment,
    release: sentryRelease,

    // No replay integration here — loaded lazily after idle (below)
    integrations: [],

    // Performance Monitoring
    tracesSampleRate: sentryEnvironment === "production" ? 0.1 : 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Session Replay rates — integration loaded lazily below
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 0.5,

    // Filter out common non-actionable errors
    ignoreErrors: [
      /extensions\//i,
      /^chrome:\/\//i,
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      "AbortError",
      "ResizeObserver loop",
      "Non-Error promise rejection",
    ],

    sendDefaultPii: false,

    beforeSend(event) {
      if (!sentryEnabled) return null;
      if (event.request?.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["Cookie"];
      }
      if (event.extra) {
        event.extra = scrubPHIFromObject(event.extra) as Record<string, unknown>;
      }
      if (event.breadcrumbs) {
        for (const breadcrumb of event.breadcrumbs) {
          if (breadcrumb.message) breadcrumb.message = scrubPHI(breadcrumb.message);
          if (breadcrumb.data) breadcrumb.data = scrubPHIFromObject(breadcrumb.data) as Record<string, unknown>;
        }
      }
      if (isPlaywrightMode) event.tags = { ...event.tags, playwright: "1" };
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) breadcrumb.message = scrubPHI(breadcrumb.message);
      if (breadcrumb.data) breadcrumb.data = scrubPHIFromObject(breadcrumb.data) as Record<string, unknown>;
      return breadcrumb;
    },
  });

  // Load the Sentry Replay integration lazily after idle — keeps its ~50KB
  // bundle completely off the initial load path.
  if (sentryEnabled && sentryDsn) {
    const addReplay = () => {
      import("@sentry/nextjs").then(({ replayIntegration }) => {
        Sentry.addIntegration(replayIntegration());
      }).catch(() => {/* ignore */});
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(addReplay, { timeout: 8000 });
    } else {
      setTimeout(addReplay, 5000);
    }
  }
}

// Schedule Sentry init after the page is interactive so it stays off the
// critical path (improves LCP and TBT on Lighthouse mobile).
if ("requestIdleCallback" in window) {
  requestIdleCallback(() => loadAndInitSentry(), { timeout: 3000 });
} else {
  setTimeout(() => loadAndInitSentry(), 1500);
}

// PostHog Analytics initialization (single source of truth - do not duplicate in provider)
// Dynamic import to avoid module-level crash when posthog-js can't initialize
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(posthogKey, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,   // Manual pageview tracking in PostHogProvider for SPA
      capture_pageleave: true,
      // Sentry already captures exceptions + has PHI scrubbing; posthog duplicating
      // this just adds network chatter and an extra module.
      capture_exceptions: false,
      autocapture: true,
      disable_session_recording: true,  // Deferred - starts after idle to avoid blocking LCP
      // Surveys module is ~25KB and we have no surveys live. Skip loading it.
      disable_surveys: true,
      session_recording: {
        maskAllInputs: true,          // PHI protection - mask all form inputs
        maskTextSelector: "[data-phi]", // Extra masking for PHI-tagged elements
      },
      debug: process.env.NODE_ENV === "development",
    });

    // Defer session recording until after the page is interactive.
    // Saves ~51KB + 550ms from the critical path (posthog-recorder.js).
    const startRecording = () => {
      posthog.startSessionRecording();
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(startRecording, { timeout: 5000 });
    } else {
      setTimeout(startRecording, 3000);
    }
  }).catch(() => {
    // PostHog not available - skip silently
  });
}
