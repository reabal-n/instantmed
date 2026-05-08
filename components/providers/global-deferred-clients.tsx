"use client"

import { type ComponentType, useEffect, useState } from "react"

import { onFirstInteraction } from "@/lib/browser/first-interaction"

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

/**
 * Keeps global non-critical clients out of first-load route chunks.
 *
 * These widgets either observe the page, show late overlays, or support post-click
 * affordances. Importing them from the root layout makes Next preload unrelated
 * homepage/marketing chunks on /request, so they are loaded manually after the
 * patient first interacts.
 */
export function GlobalDeferredClients() {
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

    const loadClients = () => {
      cleanup.push(
        scheduleIdle(() => {
          if (shouldLoadVercelAnalytics()) {
            void import("@vercel/analytics/next").then((mod) => {
              setClient("Analytics", mod.Analytics)
            })
          }
          void import("@/components/providers/google-tags").then((mod) => {
            setClient("GoogleTags", mod.GoogleTags)
          })
          void import("@/components/pwa/service-worker-registration").then((mod) => {
            setClient("ServiceWorkerRegistration", mod.ServiceWorkerRegistration)
          })
          void import("@/components/shared/cookie-banner").then((mod) => {
            setClient("CookieBanner", mod.CookieBanner)
          })
          void import("@/components/shared/referral-capture").then((mod) => {
            setClient("ReferralCapture", mod.ReferralCapture)
          })
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
          void import("@/lib/analytics/web-vitals").then((mod) => {
            setClient("WebVitalsReporter", mod.WebVitalsReporter)
          })
        })
      )
    }

    cleanup.push(onFirstInteraction(loadClients))

    return () => {
      cancelled = true
      cleanup.forEach((cancel) => cancel())
    }
  }, [])

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
      {GoogleTags ? <GoogleTags /> : null}
      {Analytics ? <Analytics /> : null}
      {WebVitalsReporter ? <WebVitalsReporter /> : null}
      {ServiceWorkerRegistration ? <ServiceWorkerRegistration /> : null}
      {ReferralCapture ? <ReferralCapture /> : null}
      {Toaster ? <Toaster position="top-center" richColors /> : null}
      {CookieBanner ? <CookieBanner /> : null}
    </>
  )
}
