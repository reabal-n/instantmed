// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import type { BeforeSendFn } from "posthog-js";

import { resolvePostHogClient } from "@/lib/analytics/posthog-client-resolver";
import { sanitizePostHogEvent } from "@/lib/analytics/posthog-privacy";
import { onFirstInteraction } from "@/lib/browser/first-interaction";
import { isPostConversionPath } from "@/lib/browser/post-conversion-path";
import { scrubSentryBreadcrumb, scrubSentryEvent } from "@/lib/observability/scrub-phi";

/**
 * Start telemetry immediately on post-conversion pages, otherwise defer to first
 * interaction (LCP/TBT protection on acquisition + /request). Confirmation pages
 * are where `purchase_completed` and the gtag purchase fire — a user who lands
 * and bounces without clicking must still be measured. This is the fix for the
 * client-pixel decay where PostHog never initialized on the success page.
 */
function startTelemetryWhenReady(callback: () => void) {
  if (isPostConversionPath()) {
    callback();
  } else {
    onFirstInteraction(callback);
  }
}

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
const isPlaywrightMode = sentryEnvironment === "e2e"
const sentryEnabled = !isPlaywrightMode && (sentryEnvironment === "production" || sentryEnvironment === "preview")
const POSTHOG_PERSONLESS_MIGRATION_KEY = "instantmed_posthog_personless_v1"

const scrubPostHogSensitiveTelemetry: BeforeSendFn = (event) => {
  return sanitizePostHogEvent(
    event as unknown as Record<string, unknown>,
  ) as typeof event
}

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

    // No replay integration.
    integrations: [],

    // Performance Monitoring
    tracesSampleRate: sentryEnvironment === "production" ? 0.1 : 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // No session replay. Product analytics stays event-only and personless.

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
      scrubSentryEvent(event);
      if (isPlaywrightMode) event.tags = { ...event.tags, playwright: "1" };
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubSentryBreadcrumb(breadcrumb);
    },
  });

}

// Gate telemetry behind first user interaction. Passive bounces should not pay
// the parse/compile cost for Sentry or PostHog on /request —
// except on post-conversion pages, where measurement must not wait for a click.
startTelemetryWhenReady(() => loadAndInitSentry());

// PostHog Analytics initialization (single source of truth - do not duplicate in provider)
// Dynamic import to avoid module-level crash when posthog-js can't initialize
if (!isPlaywrightMode && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  startTelemetryWhenReady(() => {
  import("posthog-js").then((module) => {
    const posthog = resolvePostHogClient(module);
    if (!posthog) return;

    posthog.init(posthogKey, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,   // Manual pageview tracking in PostHogProvider for SPA
      capture_pageleave: true,
      // Sentry already captures exceptions + has PHI scrubbing; posthog duplicating
      // this just adds network chatter and an extra module.
      capture_exceptions: false,
      // Manual route, intake, checkout, and purchase events provide the
      // decision-grade funnel. Generic DOM autocapture can collect labels and
      // element text without improving conversion measurement.
      autocapture: false,
      capture_heatmaps: false,
      // Native Web Vitals capture — fires $web_vitals events for LCP, FCP,
      // CLS, INP, TTFB, FID. Real-user metric (CrUX-equivalent), measured
      // from actual browsers. Zero LCP impact because posthog-js itself
      // loads after first interaction.
      capture_performance: { web_vitals: true, network_timing: false },
      disable_session_recording: true,
      // Surveys module is ~25KB and we have no surveys live. Skip loading it.
      disable_surveys: true,
      before_send: scrubPostHogSensitiveTelemetry,
      debug: process.env.NODE_ENV === "development",
    });

    // Rotate legacy browser identities once. Older builds identified guests by
    // email and signed-in users by account id; a reset gives every returning
    // browser a fresh anonymous id before any new funnel event is captured.
    try {
      if (window.localStorage.getItem(POSTHOG_PERSONLESS_MIGRATION_KEY) !== "1") {
        posthog.reset()
        window.localStorage.setItem(POSTHOG_PERSONLESS_MIGRATION_KEY, "1")
      }
    } catch {
      // Storage-restricted browsers are still protected by before_send, which
      // drops any event whose distinct id resembles a direct identifier.
    }

    // Tag every client capture with `is_e2e: false` so dashboards can filter
    // out test traffic the same way `lib/analytics/posthog-server.ts` already
    // does for server captures. Playwright runs never reach this branch
    // (init is gated on `!isPlaywrightMode` above), so registering `false`
    // unconditionally here is correct for real-user sessions.
    // Without this, the only way to exclude E2E noise was on server events,
    // and any client-side funnel chart silently mixed seed traffic with real.
    posthog.register({
      is_e2e: false,
      $process_person_profile: false,
      $geoip_disable: true,
    });
  }).catch(() => {
    // PostHog not available - skip silently
  });
  });
}
