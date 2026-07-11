"use client"

import { useEffect } from "react"

import { createLogger } from "@/lib/observability/logger"
import { clearInstantMedBrowserCaches } from "@/lib/security/browser-cache-cleanup"

const logger = createLogger("service-worker-retirement")

/**
 * Temporary Stage A bridge for clients that still have the retired worker.
 * Keep this mounted for at least 30 days after deployment so returning clients
 * can request the tombstone before all same-origin registrations are removed.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const retireServiceWorker = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.allSettled(
            registrations.map((registration) => registration.update()),
          )
        }
      } catch (error) {
        logger.warn("Service worker update check failed during retirement", {
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        await clearInstantMedBrowserCaches()
      }
    }

    if (document.readyState === "complete") {
      void retireServiceWorker()
      return
    }

    const handleLoad = () => {
      void retireServiceWorker()
    }
    window.addEventListener("load", handleLoad)
    return () => window.removeEventListener("load", handleLoad)
  }, [])

  return null
}
