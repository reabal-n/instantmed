import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SECURITY: Don't expose X-Powered-By header
  poweredByHeader: false,
  typescript: {
    // TypeScript errors have been fixed - enable strict type checking
    ignoreBuildErrors: false
  },
  // Body size limits to prevent abuse (experimental in Next.js 16)
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  // webpack config only applies when explicitly running with --webpack flag.
  // Turbopack (the v16 default) ignores this block entirely.
  webpack: (config) => {
    return config;
  },
  images: {
    // Enable Next.js Image Optimization
    unoptimized: false,
    // Configure allowed image quality values (required in Next.js 16+)
    qualities: [25, 50, 65, 75, 85, 100],
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
    }, {
      protocol: "https",
      hostname: "api.dicebear.com"
    }]
  },
  serverExternalPackages: ["@supabase/ssr", "posthog-node"],
  // Redirects for removed medication pages (Google Ads compliance) and duplicate routes consolidation
  async redirects() {
    return [
      // Medication pages redirect (Google Ads compliance)
      {
        source: "/medications",
        destination: "/",
        permanent: true
      },
      {
        source: "/medications/:path*",
        destination: "/",
        permanent: true
      },
      // Consolidate duplicate service routes to canonical paths
      {
        source: "/medical-certificates",
        destination: "/medical-certificate",
        permanent: true
      },
      {
        source: "/medical-certificates/:path*",
        destination: "/medical-certificate/:path*",
        permanent: true
      },
      {
        source: "/repeat-prescription",
        destination: "/prescriptions",
        permanent: true
      },
      {
        source: "/repeat-prescription/:path*",
        destination: "/prescriptions/:path*",
        permanent: true
      },
      {
        source: "/repeat-prescriptions",
        destination: "/prescriptions",
        permanent: true
      },
      {
        source: "/repeat-prescriptions/:path*",
        destination: "/prescriptions/:path*",
        permanent: true
      },
      // Admin redirect consolidation — replaced redirect-only page.tsx files
      {
        source: "/admin/email-outbox",
        destination: "/admin/email-hub",
        permanent: true
      },
      {
        source: "/admin/email-queue",
        destination: "/admin/email-hub",
        permanent: true
      },
      {
        source: "/admin/ops/email-outbox",
        destination: "/doctor/admin/email-outbox",
        permanent: true
      },
      {
        source: "/admin/performance-dashboard",
        destination: "/admin/performance",
        permanent: true
      },
      // Malformed URL — redirect /& (broken links, typos) to homepage
      {
        source: "/&",
        destination: "/",
        permanent: true
      },
      // Referrals — no dedicated pages; pathology/imaging referrals via general consult
      {
        source: "/referrals/pathology-imaging",
        destination: "/general-consult",
        permanent: true
      },
      {
        source: "/referrals/:path*",
        destination: "/general-consult",
        permanent: true
      },
      // Missing route redirects — prevent external 404s
      {
        source: "/erectile-dysfunction",
        destination: "/general-consult",
        permanent: true
      },
      {
        source: "/prescription",
        destination: "/prescriptions",
        permanent: true
      },
      {
        source: "/why-us",
        destination: "/about",
        permanent: true
      },
      {
        source: "/auth/sign-in",
        destination: "/auth/login",
        permanent: true
      },
      {
        source: "/health/:path*",
        destination: "/conditions/:path*",
        permanent: true
      }
    ];
  },
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
  // Security headers and caching
  async headers() {
    const securityHeaders = [{
      key: "X-DNS-Prefetch-Control",
      value: "on"
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
    }];

    // Standard CSP for all routes
    // worker-src: Allow blob: for Clerk and Sentry Replay web workers
    // child-src: Fallback for older browsers that don't support worker-src
    // NOTE: 'unsafe-eval' is required in dev/test for Next.js HMR and React hydration
    const isDev = process.env.NODE_ENV !== 'production';
    const standardCSP = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au`,
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://raw.githubusercontent.com https://svgl.app https://api.dicebear.com https://img.clerk.com https://*.clerk.com https://*.googleusercontent.com https://*.gravatar.com https://*.stripe.com https://pagead2.googlesyndication.com",
      `connect-src 'self'${isDev ? ' ws://localhost:* http://localhost:*' : ''} https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.google-analytics.com https://*.google.com https://www.googletagmanager.com https://*.googleadservices.com https://*.doubleclick.net https://*.sentry.io https://api.resend.com https://challenges.cloudflare.com https://*.posthog.com https://us.i.posthog.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au https://pagead2.googlesyndication.com`,
      "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.supabase.co https://accounts.google.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au",
      "frame-ancestors 'self'",
      // Don't upgrade insecure requests in dev (localhost is http)
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ];
    return [
      // All routes - security headers + CSP
      {
        source: "/(.*)",
        headers: [...securityHeaders, {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload"
        }, {
          key: "Content-Security-Policy",
          value: standardCSP.join("; ")
        }, {
          // Report-Only CSP: stricter policy (no unsafe-inline) that reports violations
          // without blocking anything. Used to monitor what would break if we tightened the
          // main CSP. Violations are logged to Sentry via /api/csp-report.
          key: "Content-Security-Policy-Report-Only",
          value: [
            "default-src 'self'",
            "script-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au",
            "style-src 'self' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://api.dicebear.com https://img.clerk.com https://*.clerk.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://*.posthog.com https://us.i.posthog.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://pagead2.googlesyndication.com",
            "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
            "object-src 'none'",
            "report-uri /api/csp-report",
          ].join("; ")
        }]
      },
      // Cache static assets for 1 year (immutable)
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Cache images for 1 week
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      // Cache public assets for 1 day
      {
        source: "/:path*.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/:path*.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/:path*.jpg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
    ];
  }
};

// Sentry configuration
const sentryConfig = {
  org: process.env.SENTRY_ORG || "reys-projects",
  project: process.env.SENTRY_PROJECT || "instantmed",
  silent: !process.env.CI,
  silenceErrors: true,
  // widenClientFileUpload disabled — adds significant memory overhead to
  // builds (contributes to 8GB heap requirement). Default source map upload
  // covers the standard _next/static directory which is sufficient.
  widenClientFileUpload: false,
  hideSourceMaps: true,
  webpack: {
    // Disable Sentry's Vercel deployment monitors — they fail when org/project
    // can't be resolved at build time and block the deployment check gate.
    automaticVercelMonitors: false,
  },
};

// Apply bundle analyzer, then optionally Sentry
// Skip Sentry's webpack plugin in dev — its RSC wrapper causes "Cannot read properties
// of undefined (reading 'call')" during hydration (race condition with async chunks).
// Sentry still initialises via instrumentation.ts; this only skips source maps & wrapping.
const withAnalyzer = bundleAnalyzer(nextConfig);
const useSentry = process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production';
export default useSentry ? withSentryConfig(withAnalyzer, sentryConfig) : withAnalyzer;
