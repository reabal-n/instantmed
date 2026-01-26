// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

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

Sentry.init({
  dsn: sentryDsn,
  enabled: sentryEnabled,
  environment: sentryEnvironment,
  release: sentryRelease,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Performance Monitoring
  tracesSampleRate: sentryEnvironment === "production" ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out common non-actionable errors
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Network errors
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    // User-initiated navigation
    "AbortError",
    // Common benign errors
    "ResizeObserver loop",
    "Non-Error promise rejection",
  ],

  // Disable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  beforeSend(event) {
    // Don't send events if Sentry is not enabled
    if (!sentryEnabled) {
      return null;
    }

    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
    }

    // Add E2E context tags when in PLAYWRIGHT mode
    if (isPlaywrightMode) {
      event.tags = {
        ...event.tags,
        playwright: "1",
      }
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// PostHog Analytics initialization
import posthog from "posthog-js";

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
