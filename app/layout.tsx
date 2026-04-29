import "./globals.css"

import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google"
// SkyBackground, NightSkyBackground, ScrollProgress moved to marketing pages only (perf)
import { ThemeProvider } from "next-themes"
import type React from "react"
import { Suspense } from "react"

import { GoogleTags } from "@/components/providers/google-tags"
import { MotionProvider } from "@/components/providers/motion-provider"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import { ServiceAvailabilityProvider } from "@/components/providers/service-availability-provider"
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration"
import { OrganizationSchema, WebSiteSchema } from "@/components/seo"
import { CookieBanner, LazyOverlays, PageTransitionProvider,ReferralCapture, SkipToContent, UrgentNoticeBanner } from "@/components/shared"
import { DeferredMount } from "@/components/ui/deferred-mount"
import { NetworkStatus } from "@/components/ui/error-recovery"
import { NavigationProgress } from "@/components/ui/morning/navigation-progress"
import { Toaster } from "@/components/ui/sonner"
import { WebVitalsReporter } from "@/lib/analytics/web-vitals"
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
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
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
    `Faster than your GP. Telehealth without the small talk. Medical certificates from ${PRICING_DISPLAY.MED_CERT}, repeat medication, and online doctor consults from AHPRA-registered Australian doctors. No appointment, no waiting room.`,
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
      `Faster than your GP. Telehealth without the small talk. Med certs from ${PRICING_DISPLAY.MED_CERT}, repeat medication, and online doctor consults from AHPRA-registered Australian GPs.`,
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantMed | Online Doctor Australia",
    description: `Faster than your GP. Telehealth without the small talk. Med certs from ${PRICING_DISPLAY.MED_CERT}, repeat medication, and online doctor consults from AHPRA-registered Australian GPs.`,
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
    <SupabaseAuthProvider>
      <html
        lang="en-AU"
        className={`${sourceSans.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
        suppressHydrationWarning
        style={{ backgroundColor: '#f8f7f4' }}
      >
        <head>
          {/* Preconnect to critical third-party origins.
              crossOrigin="anonymous" is required for CORS resources — without it the
              browser opens an extra non-CORS connection and the preconnect is wasted.
              Budget: ≤3 preconnects. More than that starves the main connection pool
              and actively hurts LCP. Keep only origins hit during the initial load;
              DNS-prefetch is cheap and fine for "maybe later" origins. */}
          <link rel="preconnect" href="https://o4510623218860032.ingest.us.sentry.io" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://us.posthog.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://js.stripe.com" />
          <link rel="dns-prefetch" href="https://api.stripe.com" />
          <link rel="dns-prefetch" href="https://api.dicebear.com" />
          <link rel="manifest" href="/manifest.webmanifest" />

        </head>
        <body className="font-sans antialiased text-foreground">
          <OrganizationSchema />
          <WebSiteSchema />
          <GoogleTags />
          <PostHogProvider>
          <MotionProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
                <ServiceAvailabilityProvider>
                <UrgentNoticeBanner />
                <NavigationProgress />
                <NetworkStatus />
                <SkipToContent />
                <div id="main-content" className="relative z-10">
                  <PageTransitionProvider>
                    {children}
                  </PageTransitionProvider>
                </div>
                <Toaster position="top-center" richColors />
                <LazyOverlays />
                <DeferredMount>
                  <Analytics />
                  <WebVitalsReporter />
                  <ServiceWorkerRegistration />
                </DeferredMount>
                <Suspense fallback={null}>
                  <ReferralCapture />
                </Suspense>
                <DeferredMount timeout={3000}>
                  <CookieBanner />
                </DeferredMount>
                </ServiceAvailabilityProvider>
          </ThemeProvider>
          </MotionProvider>
          </PostHogProvider>
        </body>
      </html>
    </SupabaseAuthProvider>
  )
}
