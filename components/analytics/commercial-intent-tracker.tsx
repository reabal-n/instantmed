"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { capture } from "@/lib/analytics/capture"
import { onFirstInteraction } from "@/lib/browser/first-interaction"
import type { CommercialIntentCluster } from "@/lib/seo/intents"

interface CommercialIntentTrackerProps {
  slug: string
  cluster: CommercialIntentCluster
  priority: number
  primaryQuery: string
}

const EVENT_SELECTOR = "[data-commercial-intent-event]"
const PRICE_CARD_SELECTOR = "[data-commercial-intent-price-card]"

function getUtmParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  }
}

export function CommercialIntentTracker({
  slug,
  cluster,
  priority,
  primaryQuery,
}: CommercialIntentTrackerProps) {
  const pathname = usePathname()
  const readyRef = useRef(false)
  const queuedEventsRef = useRef<Array<{ event: string; properties: Record<string, unknown> }>>([])

  useEffect(() => {
    const base = {
      slug,
      cluster,
      priority,
      primary_query: primaryQuery,
      pathname,
    }

    const captureWhenReady = (event: string, properties: Record<string, unknown> = {}) => {
      const payload = { ...base, ...properties }
      if (!readyRef.current) {
        queuedEventsRef.current.push({ event, properties: payload })
        return
      }
      capture(event, payload)
    }

    const cancelInteraction = onFirstInteraction(() => {
      const markReady = () => {
        readyRef.current = true
        capture("commercial_intent_viewed", {
          ...base,
          referrer: document.referrer || undefined,
          ...getUtmParams(),
        })
        for (const queued of queuedEventsRef.current.splice(0)) {
          capture(queued.event, queued.properties)
        }
      }

      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(markReady, { timeout: 1800 })
        return
      }

      setTimeout(markReady, 750)
    })

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const element = event.target.closest(EVENT_SELECTOR)
      if (!element) return

      captureWhenReady("commercial_intent_click", {
        action: element.getAttribute("data-commercial-intent-event") ?? "unknown",
        placement: element.getAttribute("data-commercial-intent-placement") ?? undefined,
        label: element.textContent?.trim().slice(0, 120) || undefined,
        href: element.getAttribute("href") ?? undefined,
      })
    }

    document.addEventListener("click", onClick, { capture: true })

    const priceCard = document.querySelector(PRICE_CARD_SELECTOR)
    let priceObserver: IntersectionObserver | null = null
    if (priceCard && "IntersectionObserver" in window) {
      let seen = false
      priceObserver = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting || seen) return
          seen = true
          captureWhenReady("commercial_intent_price_seen", {
            placement: priceCard.getAttribute("data-commercial-intent-placement") ?? "sidebar",
          })
          priceObserver?.disconnect()
        },
        { threshold: 0.75 },
      )
      priceObserver.observe(priceCard)
    }

    const firedDepths = new Set<number>()
    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const depth = Math.round((window.scrollY / scrollable) * 100)

      for (const marker of [50, 90]) {
        if (depth >= marker && !firedDepths.has(marker)) {
          firedDepths.add(marker)
          captureWhenReady("commercial_intent_scroll_depth", { depth: marker })
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      cancelInteraction()
      document.removeEventListener("click", onClick, { capture: true })
      window.removeEventListener("scroll", onScroll)
      priceObserver?.disconnect()
    }
  }, [slug, cluster, priority, primaryQuery, pathname])

  return null
}
