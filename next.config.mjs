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
  eslint: {
    // ESLint runs in CI, skip during build to avoid node_modules package issues
    ignoreDuringBuilds: true
  },
  // Body size limits to prevent abuse
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  webpack: (config, {
    isServer,
    dev
  }) => {
    // Disable filesystem cache in dev to prevent corruption
    if (dev) {
      config.cache = false;
    }
    // Exclude TinaCMS generated files from build
    config.resolve.alias = {
      ...config.resolve.alias,
      'tinacms/dist/client': false
    };
    return config;
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
    const standardCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.google-analytics.com https://*.sentry.io https://api.resend.com https://challenges.cloudflare.com https://*.posthog.com https://us.i.posthog.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au",
      "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.supabase.co https://accounts.google.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests"
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
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true
    },
    automaticVercelMonitors: true
  }
};

// Apply bundle analyzer, then optionally Sentry
const withAnalyzer = bundleAnalyzer(nextConfig);
export default process.env.NEXT_PUBLIC_SENTRY_DSN ? withSentryConfig(withAnalyzer, sentryConfig) : withAnalyzer;