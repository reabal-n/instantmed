import type { MetadataRoute } from "next"

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
          "/auth/post-signin", // Post-signin redirect — no content
          "/_next/",        // Next.js build output (JS/CSS chunks)
          "/search",        // Internal search
          "/*/search",      // Category search pages
        ],
      },
      // Explicitly allow AI crawlers to index public content
      // These bots power ChatGPT, Perplexity, Gemini, etc.
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
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/conditions/sitemap.xml`,
      `${baseUrl}/symptoms/sitemap.xml`,
      `${baseUrl}/locations/sitemap.xml`,
      `${baseUrl}/guides/sitemap.xml`,
      `${baseUrl}/blog/sitemap.xml`,
      `${baseUrl}/compare/sitemap.xml`,
      `${baseUrl}/intent/sitemap.xml`,
      `${baseUrl}/for/sitemap.xml`,
    ],
  }
}
