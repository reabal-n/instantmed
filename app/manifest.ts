import type { MetadataRoute } from "next"

import { PRICING_DISPLAY } from "@/lib/constants"

/**
 * Single source of truth for the PWA manifest, served at /manifest.webmanifest.
 *
 * A static public/manifest.webmanifest used to shadow this route and the two
 * diverged (the static copy shipped a hardcoded stale price). Consolidated
 * 2026-06-11: branding colors/icons came from the static file, shortcuts from
 * here, and the price now reads PRICING_DISPLAY so a price change can never
 * strand this surface again. Do not re-add a static manifest under public/.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InstantMed",
    short_name: "InstantMed",
    description: `Online Doctor Australia: medical certificates, prescriptions and consults from ${PRICING_DISPLAY.MED_CERT}`,
    start_url: "/",
    display: "standalone",
    background_color: "#F8F7F4",
    theme_color: "#2563EB",
    orientation: "portrait",
    categories: ["health", "medical", "lifestyle"],
    // Deep link shortcuts for quick access to services
    shortcuts: [
      {
        name: "New Request",
        short_name: "Request",
        description: "Start a new medical request",
        url: "/request",
      },
      {
        name: "Medical Certificate",
        short_name: "Med Cert",
        description: "Get a medical certificate",
        url: "/request?service=med-cert",
      },
      {
        name: "Repeat Prescription",
        short_name: "Prescription",
        description: "Refill your prescription",
        url: "/request?service=repeat-script",
      },
    ],
    icons: [
      {
        src: "/branding/logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/branding/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/branding/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }
}
