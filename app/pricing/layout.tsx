import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

// Revalidate every 24 hours — pricing rarely changes
export const revalidate = 86400

export const metadata: Metadata = {
  title: "Telehealth Pricing | No Hidden Fees",
  description:
    "Med certs from $19.95, prescriptions from $29.95. No subscriptions, no hidden fees. Full refund if we can't help.",
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
    title: "Telehealth Pricing | Simple & Transparent | InstantMed",
    description: "Medical certificates from $19.95, repeat prescriptions from $29.95. No subscriptions, no hidden fees. 100% refund if we can't help.",
    url: "https://instantmed.com.au/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Telehealth Pricing | Simple & Transparent | InstantMed",
    description: "Medical certificates from $19.95, repeat prescriptions from $29.95. No subscriptions, no hidden fees.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/pricing",
  },
}

/**
 * /pricing layout — BreadcrumbSchema only.
 *
 * Previously ALSO emitted FAQSchema — but pricing-client.tsx emits its own
 * FAQPage JSON-LD inline (with the full pricingFaqs data, which is the
 * canonical source), creating a duplicate FAQPage on the same URL. GSC
 * flagged this as critical 2026-04-06. Removed from layout in the same
 * fix as /general-consult (commit: duplicate FAQPage sweep).
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
