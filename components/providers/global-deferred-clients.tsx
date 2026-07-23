"use client"

import { usePathname } from "next/navigation"
import { type ComponentType, useEffect, useState } from "react"

import { onFirstInteraction } from "@/lib/browser/first-interaction"
import { isPostConversionPathname } from "@/lib/browser/post-conversion-path"
import { isExternalAnalyticsExcludedPathname } from "@/lib/browser/sensitive-capability-path"

type ToasterProps = {
  position?: "top-center"
  richColors?: boolean
}

type LoadedClients = {
  Analytics?: ComponentType
  CookieBanner?: ComponentType
  GoogleTags?: ComponentType
  NavigationProgress?: ComponentType
  NetworkStatus?: ComponentType
  ReferralCapture?: ComponentType
  ServiceWorkerRegistration?: ComponentType
  Toaster?: ComponentType<ToasterProps>
  UrgentNoticeBanner?: ComponentType
  WebVitalsReporter?: ComponentType
}

function scheduleIdle(callback: () => void, timeout = 1500) {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(callback, { timeout })
    return () => cancelIdleCallback(id)
  }

  const id = setTimeout(callback, 0)
  return () => clearTimeout(id)
}

function shouldLoadVercelAnalytics() {
  if (typeof window === "undefined") return false

  const { hostname } = window.location
  return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1"
}

const AUTHENTICATED_APP_PATH_PREFIXES = [
  "/account",
  "/admin",
  "/dashboard",
  "/doctor",
  "/patient",
] as const

function isAuthenticatedAppPath() {
  if (typeof window === "undefined") return false
  const path = window.location.pathname
  return AUTHENTICATED_APP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
}

function shouldLoadCookieBanner() {
  if (typeof window === "undefined") return false
  const path = window.location.pathname
  return !AUTHENTICATED_APP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
}

/**
 * Keeps global non-critical clients out of first-load route chunks.
 *
 * These widgets either observe the page, show late overlays, or support post-click
 * affordances. Importing them from the root layout makes Next preload unrelated
 * homepage/marketing chunks on /request, so they are loaded manually after the
 * patient first interacts.
 */
export function GlobalDeferredClients() {
  const pathname = usePathname()
  const allowExternalTelemetry = !isExternalAnalyticsExcludedPathname(pathname)
  const allowConversionMeasurement = isPostConversionPathname(pathname)
  const [clients, setClients] = useState<LoadedClients>({})

  useEffect(() => {
    let cancelled = false
    const cleanup: Array<() => void> = []

    const setClient = <Key extends keyof LoadedClients>(
      key: Key,
      component: LoadedClients[Key]
    ) => {
      if (cancelled || !component) return
      setClients((current) => ({ ...current, [key]: component }))
    }

    const allowCookieBanner = shouldLoadCookieBanner()
    const loadClients = () => {
      cleanup.push(
        scheduleIdle(() => {
          if (allowExternalTelemetry && shouldLoadVercelAnalytics()) {
            void import("@vercel/analytics/next").then((mod) => {
              setClient("Analytics", mod.Analytics)
            })
          }
          if (allowExternalTelemetry || allowConversionMeasurement) {
            void import("@/components/providers/google-tags").then((mod) => {
              setClient("GoogleTags", mod.GoogleTags)
            })
          }
          void import("@/components/pwa/service-worker-registration").then((mod) => {
            setClient("ServiceWorkerRegistration", mod.ServiceWorkerRegistration)
          })
          if (allowCookieBanner) {
            void import("@/components/shared/cookie-banner").then((mod) => {
              setClient("CookieBanner", mod.CookieBanner)
            })
          }
          if (allowExternalTelemetry) {
            void import("@/components/shared/referral-capture").then((mod) => {
              setClient("ReferralCapture", mod.ReferralCapture)
            })
          }
          void import("@/components/shared/urgent-notice-banner").then((mod) => {
            setClient("UrgentNoticeBanner", mod.UrgentNoticeBanner)
          })
          void import("@/components/ui/error-recovery").then((mod) => {
            setClient("NetworkStatus", mod.NetworkStatus)
          })
          void import("@/components/ui/morning/navigation-progress").then((mod) => {
            setClient("NavigationProgress", mod.NavigationProgress)
          })
          void import("@/components/ui/sonner").then((mod) => {
            setClient("Toaster", mod.Toaster as ComponentType<ToasterProps>)
          })
          if (allowExternalTelemetry) {
            void import("@/lib/analytics/web-vitals").then((mod) => {
              setClient("WebVitalsReporter", mod.WebVitalsReporter)
            })
          }
        })
      )
    }

    // Post-conversion and authenticated app shells bypass the first-interaction
    // gate. Staff/patient clinical actions should not be the trigger that loads
    // global deferred clients and remounts late overlays.
    if (allowConversionMeasurement || isAuthenticatedAppPath()) {
      loadClients()
    } else {
      cleanup.push(onFirstInteraction(loadClients))
    }

    return () => {
      cancelled = true
      cleanup.forEach((cancel) => cancel())
    }
  }, [allowConversionMeasurement, allowExternalTelemetry])

  const {
    Analytics,
    CookieBanner,
    GoogleTags,
    NavigationProgress,
    NetworkStatus,
    ReferralCapture,
    ServiceWorkerRegistration,
    Toaster,
    UrgentNoticeBanner,
    WebVitalsReporter,
  } = clients

  return (
    <>
      {UrgentNoticeBanner ? <UrgentNoticeBanner /> : null}
      {NavigationProgress ? <NavigationProgress /> : null}
      {NetworkStatus ? <NetworkStatus /> : null}
      {(allowExternalTelemetry || allowConversionMeasurement) && GoogleTags ? <GoogleTags /> : null}
      {allowExternalTelemetry && Analytics ? <Analytics /> : null}
      {allowExternalTelemetry && WebVitalsReporter ? <WebVitalsReporter /> : null}
      {ServiceWorkerRegistration ? <ServiceWorkerRegistration /> : null}
      {allowExternalTelemetry && ReferralCapture ? <ReferralCapture /> : null}
      {Toaster ? <Toaster position="top-center" richColors /> : null}
      {CookieBanner ? <CookieBanner /> : null}
    </>
  )
}
