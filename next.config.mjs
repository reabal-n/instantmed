import path from "path";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  experimental: {
    swcPlugins: [["@onlook/nextjs", {
      root: path.resolve(".")
    }]]
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScript errors have been fixed - enable strict type checking
    ignoreBuildErrors: false
  },
  images: {
    // Enable Next.js Image Optimization
    unoptimized: false,
    remotePatterns: [{
      protocol: "https",
      hostname: "**.supabase.co"
    }, {
      protocol: "https",
      hostname: "images.unsplash.com"
    }, {
      protocol: "https",
      hostname: "raw.githubusercontent.com"
    }, {
      protocol: "https",
      hostname: "svgl.app"
    }]
  },
  serverExternalPackages: ["@supabase/ssr"],
  // PostHog reverse proxy rewrites
  async rewrites() {
    return [{
      source: "/ingest/static/:path*",
      destination: "https://us-assets.i.posthog.com/static/:path*"
    }, {
      source: "/ingest/:path*",
      destination: "https://us.i.posthog.com/:path*"
    }];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  // Security headers
  async headers() {
    return [{
      source: "/:path*",
      headers: [{
        key: "X-DNS-Prefetch-Control",
        value: "on"
      }, {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload"
      }, {
        key: "X-Content-Type-Options",
        value: "nosniff"
      }, {
        key: "X-Frame-Options",
        value: "SAMEORIGIN"
      }, {
        key: "X-XSS-Protection",
        value: "1; mode=block"
      }, {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin"
      }, {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()"
      }, {
        key: "Content-Security-Policy",
        value: ["default-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://*.clerk.accounts.dev https://*.clerk.instantmed.com.au https://challenges.cloudflare.com", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com data:", "img-src 'self' data: blob: https: http:", "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.clerk.accounts.dev https://*.clerk.instantmed.com.au https://*.google-analytics.com https://*.sentry.io https://api.resend.com https://challenges.cloudflare.com https://*.posthog.com https://us.i.posthog.com", "frame-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://*.clerk.instantmed.com.au https://challenges.cloudflare.com", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", "upgrade-insecure-requests"].join("; ")
      }]
    }];
  }
};

// Sentry configuration
const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true
};

// Apply bundle analyzer, then optionally Sentry
const withAnalyzer = bundleAnalyzer(nextConfig);
export default process.env.NEXT_PUBLIC_SENTRY_DSN ? withSentryConfig(withAnalyzer, sentryConfig) : withAnalyzer;