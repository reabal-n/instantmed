import "./globals.css"

import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google"
// SkyBackground, NightSkyBackground, ScrollProgress moved to marketing pages only (perf)
import { ThemeProvider } from "next-themes"
import type React from "react"

import { AttributionCapture } from "@/components/providers/attribution-capture"
import { DraftDiscardRetry } from "@/components/providers/draft-discard-retry"
import { GlobalDeferredClients } from "@/components/providers/global-deferred-clients"
import { PostHogLoader } from "@/components/providers/posthog-loader"
import { ServiceAvailabilityProvider } from "@/components/providers/service-availability-provider"
import { OrganizationSchema } from "@/components/seo/schemas/organization"
import { WebSiteSchema } from "@/components/seo/schemas/website"
import { SkipToContent } from "@/components/shared/skip-to-content"
import { PRICING_DISPLAY } from "@/lib/constants"
import { SupabaseAuthProvider } from "@/lib/supabase/auth-provider"

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
})

// Display face for hero headlines (48px+) and signature brand moments.
// Plus Jakarta Sans is humanist, modern, has character at large sizes.
// Body text stays Source Sans 3.
//
// display: "optional" (not "swap") eliminates the LCP wobble on the hero
// "Faster than your GP" headline. With swap, the fallback font renders
// first and Plus Jakarta swaps in on load, causing a visible reflow as
// the title shifts and re-wraps. With optional, the browser waits ~100ms
// for the font; if it misses the window, the fallback is kept for the
// page load. Combined with next/font's adjustFontFallback metrics, the
// fallback already matches Plus Jakarta's x-height closely so the
// trade-off (some first-loads see the fallback) is invisible to most
// users while CLS goes to zero.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "optional",
  weight: ["500", "600", "700"],
  preload: false,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400"],
  // Only used for `font-mono` in error pages / verify / dashboard admin tables.
  // Never on the marketing critical path, so skip the <link rel="preload"> — the
  // font is still fetched lazily when a .font-mono element is encountered.
  preload: false,
})

// Source Sans 3 for body. Plus Jakarta Sans for display (h1/hero). JetBrains Mono for code only.

export const metadata: Metadata = {
  title: {
    default: "InstantMed | Online Doctor Australia",
    template: "%s | InstantMed",
  },
  description:
    `Online doctor care for medical certificates from ${PRICING_DISPLAY.MED_CERT}, repeat medication, and consult requests from AHPRA-registered Australian doctors. No appointment, no waiting room.`,
  keywords: [
    "online doctor Australia",
    "telehealth Australia",
    "medical certificate online",
    "online doctor consultation",
    "doctor online",
    "sick certificate",
    "repeat request online",
    "telehealth doctor",
    "virtual doctor",
    "InstantMed",
  ],
  icons: {
    shortcut: "/favicon.ico",
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
  },
  authors: [{ name: "InstantMed" }],
  creator: "InstantMed",
  publisher: "InstantMed",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://instantmed.com.au"),
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://instantmed.com.au",
    siteName: "InstantMed",
    title: "InstantMed | Online Doctor Australia",
    description:
      `Online doctor care for med certs from ${PRICING_DISPLAY.MED_CERT}, repeat medication, and consult requests from AHPRA-registered Australian doctors.`,
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantMed | Online Doctor Australia",
    description: `Online doctor care for med certs from ${PRICING_DISPLAY.MED_CERT}, repeat medication, and consult requests from AHPRA-registered Australian doctors.`,
    // Twitter image handled by app/opengraph-image.tsx convention file
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Google Search Console verification code
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    // Bing Webmaster Tools verification code
    // Get it from: https://www.bing.com/webmasters → Add your site → HTML meta tag
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION && {
        "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION,
      }),
    },
  },
  generator: "Next.js",
}

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
}

// Inline JsonLd removed - OrganizationSchema from healthcare-schema.tsx is the single source of truth

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en-AU"
      data-scroll-behavior="smooth"
      className={`${sourceSans.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
      style={{ backgroundColor: "var(--background, #F8F7F4)" }}
    >
      <head>
        {/* Analytics and replay are interaction-gated; keep only non-analytics
            DNS hints that may be needed after the patient reaches payment. */}
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://api.dicebear.com" />

      </head>
      <body
        className="font-sans antialiased text-foreground"
        style={{ backgroundColor: "var(--background, #F8F7F4)" }}
      >
        <SupabaseAuthProvider>
          <OrganizationSchema />
          <WebSiteSchema />
          <AttributionCapture />
          <DraftDiscardRetry />
          <PostHogLoader>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
                <ServiceAvailabilityProvider>
                <GlobalDeferredClients />
                <SkipToContent />
                <div id="main-content" tabIndex={-1} className="relative z-10 focus:outline-none">
                  {children}
                </div>
                </ServiceAvailabilityProvider>
          </ThemeProvider>
          </PostHogLoader>
        </SupabaseAuthProvider>
      </body>
    </html>
  )
}
