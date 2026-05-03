"use client"

import Script from "next/script"
import { useEffect } from "react"

import { captureAttribution } from "@/lib/analytics/attribution"

// Only load Google tags on Vercel production - skip preview deployments and local dev.
// NEXT_PUBLIC_VERCEL_ENV is set automatically by Vercel: 'production' | 'preview' | 'development'
const IS_PROD = process.env.NEXT_PUBLIC_VERCEL_ENV === "production"

const CONSENT_INIT = `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
// Australian implied consent model (Privacy Act 1988).
// Defaults to granted — users can opt out via cookie banner.
gtag("consent","default",{
  ad_storage:"granted",
  ad_user_data:"granted",
  ad_personalization:"denied",
  analytics_storage:"granted",
  functionality_storage:"granted",
  personalization_storage:"denied",
  security_storage:"granted"
});
`

/**
 * Loads Google Tag (AW-17795889471) with Consent Mode v2.
 *
 * Uses next/script so the gtag.js src appears in the initial SSR HTML,
 * making it detectable by Google's tag coverage crawler. The earlier
 * useEffect+DOM approach caused Google to report /medical-certificate
 * as "Not tagged" because the script was only injected after JS executed.
 *
 * Consent defaults are set via a beforeInteractive inline script so they
 * are in the dataLayer before gtag.js loads (required for Consent Mode v2).
 */
export function GoogleTags() {
  useEffect(() => {
    captureAttribution()
  }, [])

  if (!IS_PROD) return null

  return (
    <>
      {/* beforeInteractive is intentional: consent defaults must be in dataLayer
          before gtag.js loads (Consent Mode v2 requirement). The lint rule targets
          pages/_document.js usage but this pattern works correctly in App Router. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script
        id="google-consent-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: CONSENT_INIT }}
      />
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-17795889471"
        strategy="afterInteractive"
        onLoad={() => {
          window.gtag?.("js", new Date())
          window.gtag?.("config", "AW-17795889471", { allow_enhanced_conversions: true })
        }}
      />
    </>
  )
}
