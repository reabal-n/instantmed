"use client"

import { useEffect } from "react"

import { capture } from "@/lib/analytics/capture"

const REF_COOKIE = "instantmed_ref"
const REF_COOKIE_TTL_DAYS = 30

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`
}

export function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")
    if (!ref || typeof document === "undefined") return

    // Store for 30 days - persists across pages until checkout
    setCookie(REF_COOKIE, ref, REF_COOKIE_TTL_DAYS)

    // Fire PostHog event for attribution visibility
    capture("referral_link_clicked", {
      referral_code: ref,
      source: "url_param",
    })
  }, [])

  return null
}
