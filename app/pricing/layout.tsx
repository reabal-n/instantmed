import type { Metadata } from "next"

import { BreadcrumbSchema } from "@/components/seo"
import { PRICING_DISPLAY } from "@/lib/constants"
import { GUARANTEE } from "@/lib/marketing/voice"

// Revalidate every 24 hours - pricing rarely changes
export const revalidate = 86400

export const metadata: Metadata = {
  title: "Telehealth Pricing | Five Focused Services",
  description:
    `Medical certificates from ${PRICING_DISPLAY.MED_CERT}, repeat prescriptions from ${PRICING_DISPLAY.REPEAT_SCRIPT}, and focused ED, hair-loss, and women's-health assessments from ${PRICING_DISPLAY.CONSULT}. No subscription. ${GUARANTEE}`,
  keywords: [
    "telehealth pricing australia",
    "online doctor cost",
    "medical certificate price",
    "prescription cost online",
    "telehealth consultation fee",
    "cheap online doctor",
    "affordable telehealth",
    "no subscription telehealth",
  ],
  openGraph: {
    title: "Telehealth Pricing | Five Focused Services | InstantMed",
    description: `Medical certificates from ${PRICING_DISPLAY.MED_CERT}, repeat prescriptions from ${PRICING_DISPLAY.REPEAT_SCRIPT}, and focused assessments from ${PRICING_DISPLAY.CONSULT}. No subscription. ${GUARANTEE}`,
    url: "https://instantmed.com.au/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Telehealth Pricing | Five Focused Services | InstantMed",
    description: `Medical certificates from ${PRICING_DISPLAY.MED_CERT}, repeat prescriptions from ${PRICING_DISPLAY.REPEAT_SCRIPT}, and focused assessments from ${PRICING_DISPLAY.CONSULT}.`,
  },
  alternates: {
    canonical: "https://instantmed.com.au/pricing",
  },
}

/**
 * /pricing layout - BreadcrumbSchema only.
 *
 * Previously ALSO emitted FAQSchema - but pricing-content.tsx emits its own
 * FAQPage JSON-LD inline (with the full pricingFaqs data, which is the
 * canonical source), creating a duplicate FAQPage on the same URL. GSC
 * flagged this as critical 2026-04-06. Removed from layout in the same
 * fix as /general-consult (commit: duplicate FAQPage sweep).
 *
 * The root OrganizationSchema owns the catalog-wide five-service OfferCatalog.
 * This route deliberately does not duplicate those service offers as separate
 * JSON-LD nodes; visible pricing inventory still derives from SERVICE_CATALOG.
 */
export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Pricing", url: "https://instantmed.com.au/pricing" }
        ]}
      />
      {children}
    </>
  )
}
