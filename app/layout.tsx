import type React from "react"
import type { Metadata, Viewport } from "next"
import { Source_Sans_3, JetBrains_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Analytics } from "@vercel/analytics/next"
import { WebVitalsReporter } from "@/lib/analytics/web-vitals"
import { Toaster } from "@/components/ui/sonner"
import { SkipToContent } from "@/components/shared/skip-to-content"
// SkyBackground, NightSkyBackground, ScrollProgress moved to marketing pages only (perf)
import { ThemeProvider } from "next-themes"

import { OrganizationSchema } from "@/components/seo/healthcare-schema"
import { PostHogIdentify } from "@/components/analytics/posthog-identify"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import { NetworkStatus } from "@/components/ui/error-recovery"
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration"
import { CookieBanner } from "@/components/shared/cookie-banner"
import { LazyOverlays } from "@/components/shared/lazy-overlays"
import { PageTransitionProvider } from "@/components/shared/page-transition-provider"
import Script from "next/script"
import "./globals.css"

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400"],
})

// Source Sans 3 for all text. JetBrains Mono for code only.

export const metadata: Metadata = {
  title: {
    default: "InstantMed | Online Doctor Australia",
    template: "%s | InstantMed",
  },
  description:
    "Get medical certificates, prescriptions & doctor consults online from $19.95. AHPRA-registered Australian doctors. No video calls, results in under an hour.",
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
    icon: "/branding/logo.png",
    apple: "/apple-icon.png",
  },
  authors: [{ name: "InstantMed" }],
  creator: "InstantMed",
  publisher: "InstantMed",
  metadataBase: new URL("https://instantmed.com.au"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://instantmed.com.au",
    siteName: "InstantMed",
    title: "InstantMed | Online Doctor Australia",
    description:
      "Med certs, scripts & consults from $19.95. AHPRA-registered Australian GPs. No video calls, results in under an hour.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "InstantMed - Real doctors. Zero nonsense.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantMed | Online Doctor Australia",
    description: "Med certs, scripts & consults from $19.95. AHPRA-registered Australian GPs. No video calls, results in under an hour.",
    images: ["/og-image.png"],
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
    // Get it from: https://search.google.com/search-console
    // Property Settings → Ownership verification → HTML tag method
    // Copy the content value from the meta tag
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
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

// Inline JsonLd removed — OrganizationSchema from healthcare-schema.tsx is the single source of truth

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${sourceSans.variable} ${jetbrainsMono.variable}`}
        suppressHydrationWarning
      >
        <head>
          {/* Preconnect to critical third-party origins */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://api.dicebear.com" />
          <link rel="preconnect" href="https://central-ostrich-48.clerk.accounts.dev" />
          <link rel="dns-prefetch" href="https://js.stripe.com" />
          <link rel="dns-prefetch" href="https://api.stripe.com" />
          <link rel="manifest" href="/manifest.webmanifest" />

          {/* Google Consent Mode v2 - must load BEFORE gtag */}
          <Script id="google-consent-mode" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'granted',
                'functionality_storage': 'granted',
                'personalization_storage': 'denied',
                'security_storage': 'granted',
                'wait_for_update': 500
              });
            `}
          </Script>

          {/* Google tag (gtag.js) */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=AW-17795889471"
            strategy="afterInteractive"
          />
          <Script id="google-gtag" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17795889471', {
                'allow_enhanced_conversions': true
              });
            `}
          </Script>
          <OrganizationSchema />
        </head>
        <body className="font-sans antialiased text-foreground" style={{ background: 'transparent' }}>
          <PostHogProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
                <NetworkStatus />
                <SkipToContent />
                <div id="main-content" className="relative z-10">
                  <PageTransitionProvider>
                    {children}
                  </PageTransitionProvider>
                </div>
                <Toaster position="top-center" richColors />
                <LazyOverlays />
                <Analytics />
                <WebVitalsReporter />
                <PostHogIdentify />
                <ServiceWorkerRegistration />
                <CookieBanner />
          </ThemeProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
