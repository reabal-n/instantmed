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
          "/medications/",  // Compliance - no drug names indexed
          "/*?*",           // Parameterized URLs
          "/search",        // Internal search
          "/*/search",      // Category search pages
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
