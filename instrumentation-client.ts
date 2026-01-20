// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is configured
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (!sentryDsn) {
  // eslint-disable-next-line no-console
  console.warn("[Sentry] NEXT_PUBLIC_SENTRY_DSN not configured - error tracking disabled");
}

Sentry.init({
  dsn: sentryDsn,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

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
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
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
