"use client"

import Script from "next/script"
import { useEffect, useState } from "react"

import { GOOGLE_ADS_ID, GOOGLE_ANALYTICS_ID } from "@/lib/analytics/google-tag-ids"
import { onFirstInteraction } from "@/lib/browser/first-interaction"

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
  ad_personalization:"granted",
  analytics_storage:"granted",
  functionality_storage:"granted",
  personalization_storage:"granted",
  security_storage:"granted"
});
`

/**
 * Loads Google Tag (AW-17795889471) with Consent Mode v2.
 *
 * Remote Google scripts wait until first interaction to protect mobile LCP/TBT
 * on acquisition pages and /request. Local click-ID capture lives in
 * AttributionCapture so it can stay tiny and critical.
 */
export function GoogleTags() {
  const [canLoadTags, setCanLoadTags] = useState(false)

  useEffect(() => {
    if (!IS_PROD) return

    let cancelIdleLoad: (() => void) | undefined
    const cancelInteraction = onFirstInteraction(() => {
      const showTags = () => setCanLoadTags(true)

      if (typeof requestIdleCallback !== "undefined") {
        const id = requestIdleCallback(showTags, { timeout: 1500 })
        cancelIdleLoad = () => cancelIdleCallback(id)
        return
      }

      const id = setTimeout(showTags, 0)
      cancelIdleLoad = () => clearTimeout(id)
    })

    return () => {
      cancelInteraction()
      cancelIdleLoad?.()
    }
  }, [])

  if (!IS_PROD || !canLoadTags) return null

  return (
    <>
      <Script
        id="google-consent-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: CONSENT_INIT }}
      />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
        onLoad={() => {
          window.gtag?.("js", new Date())
          window.gtag?.("config", GOOGLE_ADS_ID, { allow_enhanced_conversions: true })
          window.gtag?.("config", GOOGLE_ANALYTICS_ID)
        }}
      />
    </>
  )
}
