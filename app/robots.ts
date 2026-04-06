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
          "/auth/",         // Auth flow (sign-in, callback)
          "/_next/",        // Next.js build output (JS/CSS chunks)
          // Canonical tags handle duplicate parameterized URLs — no blanket block needed
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
