import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Protected routes
          "/patient/",
          "/doctor/",
          // API routes
          "/api/",
          // Auth callbacks
          "/auth/callback",
          "/auth/reset-password",
          // Dynamic request pages
          "/patient/requests/",
          "/doctor/requests/",
        ],
      },
      {
        // Block aggressive crawlers
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "ChatGPT-User",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "anthropic-ai",
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
