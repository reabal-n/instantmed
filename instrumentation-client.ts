// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { scrubPHI, scrubPHIFromObject } from "@/lib/observability/scrub-phi";

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
    if (!sentryEnabled) return null;

    // Scrub sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
    }
    // Scrub PHI from extra context
    if (event.extra) {
      event.extra = scrubPHIFromObject(event.extra) as Record<string, unknown>;
    }
    // Scrub breadcrumbs
    if (event.breadcrumbs) {
      for (const breadcrumb of event.breadcrumbs) {
        if (breadcrumb.message) breadcrumb.message = scrubPHI(breadcrumb.message);
        if (breadcrumb.data) breadcrumb.data = scrubPHIFromObject(breadcrumb.data) as Record<string, unknown>;
      }
    }

    // Add E2E context tags when in PLAYWRIGHT mode
    if (isPlaywrightMode) {
      event.tags = { ...event.tags, playwright: "1" };
    }

    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.message) breadcrumb.message = scrubPHI(breadcrumb.message);
    if (breadcrumb.data) breadcrumb.data = scrubPHIFromObject(breadcrumb.data) as Record<string, unknown>;
    return breadcrumb;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// PostHog Analytics initialization (single source of truth — do not duplicate in provider)
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
      capture_exceptions: true,
      autocapture: true,
      debug: process.env.NODE_ENV === "development",
    });
  }).catch(() => {
    // PostHog not available — skip silently
  });
}
