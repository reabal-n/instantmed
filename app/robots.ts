import type { MetadataRoute } from "next"

import { AUTH_POST_SIGNIN_HREF } from "@/lib/navigation/auth-handoff"

/**
 * Robots.txt configuration
 * 
 * Defines crawling rules for search engines
 * - Allow all public marketing and SEO pages
 * - Disallow auth, dashboard, API routes
 * - Disallow parameterized URLs (search, filters)
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/patient/",      // Patient dashboard
          "/doctor/",       // Doctor dashboard
          "/admin/",        // Admin dashboard
          "/api/",          // API routes
          // NOTE: /auth/ is intentionally NOT blocked for Googlebot.
          // Auth pages have robots: noindex in their metadata layout.
          // Blocking /auth/ in robots.txt creates a catch-22: Google can't
          // crawl to see the noindex tag, so already-indexed auth pages stay
          // in the index indefinitely. Allow crawl, let noindex do the work.
          "/auth/callback",   // OAuth callback — no content, pure redirect
          "/auth/confirm",    // Email confirm — no content, pure redirect
          AUTH_POST_SIGNIN_HREF, // Post-signin redirect — no content
          "/_next/",        // Next.js build output (JS/CSS chunks)
          "/search",        // Internal search
          "/*/search",      // Category search pages
        ],
      },
      // Explicitly allow AI crawlers to index public content
      // These bots power ChatGPT, Perplexity, Gemini, etc.
      {
        userAgent: "OAI-SearchBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/patient/", "/doctor/", "/admin/", "/api/", "/auth/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/patient/", "/doctor/", "/admin/", "/api/", "/auth/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/patient/", "/doctor/", "/admin/", "/api/", "/auth/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/patient/", "/doctor/", "/admin/", "/api/", "/auth/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/patient/", "/doctor/", "/admin/", "/api/", "/auth/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/patient/", "/doctor/", "/admin/", "/api/", "/auth/"],
      },
    ],
    // Only advertise sitemaps that actually contain URLs. The compare / intent
    // / for / guides surfaces are wholesale-iceboxed (noindex,follow, empty
    // sitemaps per lib/seo/index-policy.ts) — advertising their empty sitemaps
    // just generated a permanent "Sitemap is empty" error row in GSC. Their
    // pages stay live and link-followed; they simply aren't sitemap-listed.
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/conditions/sitemap.xml`,
      `${baseUrl}/symptoms/sitemap.xml`,
      `${baseUrl}/locations/sitemap.xml`,
      `${baseUrl}/blog/sitemap.xml`,
    ],
  }
}
