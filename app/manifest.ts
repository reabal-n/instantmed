import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InstantMed - Online Doctor Consultations",
    short_name: "InstantMed",
    description: "Medical certificates, prescriptions, and referrals online from AHPRA-registered Australian GPs",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbfc",
    theme_color: "#00E2B5",
    orientation: "portrait",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
  }
}
