import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SECURITY: Don't expose X-Powered-By header
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: {
    // TypeScript errors have been fixed - enable strict type checking
    ignoreBuildErrors: false
  },
  // Body size limits to prevent abuse
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
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
  // Ensure the certificate PDF template is bundled into the serverless function.
  // Without this, `public/templates/template.pdf` is missing from /var/task at
  // runtime and `renderTemplatePdf()` falls back to a fragile HTTP self-fetch.
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/templates/**/*"],
    "/app/**/*": ["./public/templates/**/*"],
    "/doctor/**/*": ["./public/templates/**/*"],
  },
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
      // Drug detail pages — consolidated into /prescriptions (TGA Schedule 4 compliance).
      // The live drug-detail pages at /prescriptions/med/[slug] exposed Schedule 4
      // drug names to the consumer surface; removed in favour of a single consult CTA.
      {
        source: "/prescriptions/med",
        destination: "/prescriptions",
        permanent: true
      },
      {
        source: "/prescriptions/med/:path*",
        destination: "/prescriptions",
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
        destination: "/admin/email-hub",
        permanent: true
      },
      // Malformed URL — redirect /& (broken links, typos) to homepage
      {
        source: "/&",
        destination: "/",
        permanent: true
      },
      // Referrals — no dedicated pages; route directly to /consult (single hop)
      {
        source: "/referrals/pathology-imaging",
        destination: "/consult",
        permanent: true
      },
      {
        source: "/referrals/:path*",
        destination: "/consult",
        permanent: true
      },
      // Short URL for ED landing — marketing/link-in-bio friendly
      {
        source: "/ed",
        destination: "/erectile-dysfunction",
        permanent: true
      },
      // Missing route redirects — prevent external 404s
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
      },
      // Condition-location combos → parent condition pages (thin content consolidation)
      {
        source: "/conditions/:slug/:city",
        destination: "/conditions/:slug",
        permanent: true
      },
      // Canonical service route consolidation
      { source: "/weight-management", destination: "/weight-loss", permanent: true },
      { source: "/weight-management/:path*", destination: "/weight-loss/:path*", permanent: true },
      // Redirect-only pages moved to edge — no React rendering cost
      { source: "/gp-consult", destination: "/consult", permanent: true },
      { source: "/consult/request", destination: "/request?service=consult", permanent: false },
      { source: "/prescriptions/request", destination: "/request?service=prescription", permanent: false },
      { source: "/prescriptions/new", destination: "/request?service=consult", permanent: false },
      // /flow was the deprecated parallel intake system — deleted in 2026-04-08.
      // Any bookmarks or stale external links 301 to the canonical /request flow.
      { source: "/flow", destination: "/request", permanent: true },
      { source: "/flow/:path*", destination: "/request", permanent: true },
      // /general-consult cannibalized /consult (flagged in SEO audit + GSC
      // "crawled-not-indexed" for /consult). /consult is the stronger page
      // (ServiceFunnelPage, 12 FAQs, feature-flagged med-cert redirect
      // banner, HowToSchema). /general-consult → /consult, permanent.
      { source: "/general-consult", destination: "/consult", permanent: true },
      { source: "/admin/studio", destination: "/admin/settings/templates", permanent: true },
      { source: "/admin/settings", destination: "/admin/features", permanent: true },
      // Public image path migration — old root paths redirected
      { source: "/:filename(asian-australian-woman-professional-headshot-smili.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(asian-woman-professional-headshot-warm-smile.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(female-doctor-professional-headshot-warm-smile-aus.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(indian-australian-woman-professional-headshot-smil.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(middle-aged-australian-man-kind-face-professional-.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(middle-aged-australian-man-with-glasses-friendly-p.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(prescription-medication-pharmacy.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(professional-businesswoman-australian-headshot-con.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(young-australian-man-creative-professional-headsho.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(young-australian-man-with-beard-casual-friendly-he.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(young-australian-woman-red-hair-professional-heads.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(young-australian-woman-with-blonde-hair-smiling-pr.jpg)", destination: "/images/people/:filename", permanent: true },
      { source: "/:filename(young-university-student-male-casual-headshot-frie.jpg)", destination: "/images/people/:filename", permanent: true },
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
    // worker-src: Allow blob: for Sentry Replay web workers
    // child-src: Fallback for older browsers that don't support worker-src
    // NOTE: 'unsafe-eval' is required in dev/test for Next.js HMR and React hydration
    const isDev = process.env.NODE_ENV !== 'production';
    const standardCSP = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://va.vercel-scripts.com`,
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://raw.githubusercontent.com https://svgl.app https://api.dicebear.com https://*.googleusercontent.com https://*.gravatar.com https://*.stripe.com https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com",
      `connect-src 'self'${isDev ? ' ws://localhost:* http://localhost:*' : ''} https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.google-analytics.com https://*.google.com https://www.googletagmanager.com https://*.googleadservices.com https://*.doubleclick.net https://*.sentry.io https://api.resend.com https://challenges.cloudflare.com https://*.posthog.com https://us.i.posthog.com https://accounts.google.com https://pagead2.googlesyndication.com https://*.vercel-insights.com https://va.vercel-scripts.com`,
      "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://portal.sandbox.parchment.health https://portal.parchment.health",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.supabase.co https://accounts.google.com",
      "frame-ancestors 'self'",
      // Don't upgrade insecure requests in dev (localhost is http)
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
      // Report violations to Sentry via /api/csp-report (prod only — no value flooding from localhost)
      ...(isDev ? [] : ["report-uri /api/csp-report"]),
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
        },
        // Report-Only CSP: production only — dev generates too many false violations
        // from Turbopack HMR (eval), PostHog workers (blob), and inline dev tooling.
        ...(isDev ? [] : [{
          key: "Content-Security-Policy-Report-Only",
          value: [
            "default-src 'self'",
            "script-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://va.vercel-scripts.com",
            "style-src 'self' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://api.dicebear.com https://*.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://*.posthog.com https://us.i.posthog.com https://accounts.google.com https://pagead2.googlesyndication.com https://*.vercel-insights.com https://va.vercel-scripts.com",
            "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://portal.sandbox.parchment.health https://portal.parchment.health",
            "object-src 'none'",
            "report-uri /api/csp-report",
          ].join("; ")
        }])]
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
  org: process.env.SENTRY_ORG || "instantmed",
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

// Apply bundle analyzer, then Sentry
const withAnalyzer = bundleAnalyzer(nextConfig);
const useSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
export default useSentry ? withSentryConfig(withAnalyzer, sentryConfig) : withAnalyzer;
