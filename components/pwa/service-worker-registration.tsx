"use client"

/**
 * Service Worker Registration Component
 * 
 * Registers the service worker for PWA functionality and offline support.
 * Should be included in the root layout.
 */

import { useEffect } from "react"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("service-worker")

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }
    
    // Only register in production
    if (process.env.NODE_ENV !== "production") {
      logger.debug("Service worker registration skipped in development")
      return
    }
    
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })
        
        logger.info("Service worker registered", {
          scope: registration.scope,
        })
        
        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (!newWorker) return
          
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available
              logger.info("New service worker version available")
              
              // Optionally notify user of update
              // eslint-disable-next-line no-alert -- Intentional: browser confirm for PWA update
              if (window.confirm("A new version is available. Reload to update?")) {
                newWorker.postMessage("skipWaiting")
                window.location.reload()
              }
            }
          })
        })
      } catch (error) {
        logger.error("Service worker registration failed", {}, error instanceof Error ? error : undefined)
      }
    }
    
    // Register after page load to not block initial render
    if (document.readyState === "complete") {
      registerServiceWorker()
    } else {
      window.addEventListener("load", registerServiceWorker)
      return () => window.removeEventListener("load", registerServiceWorker)
    }
  }, [])
  
  return null
}
