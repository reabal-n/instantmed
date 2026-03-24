import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InstantMed - Online Doctor Consultations",
    short_name: "InstantMed",
    description: "Medical certificates, prescriptions, and referrals online from AHPRA-registered Australian GPs",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbfc",
    theme_color: "#3B82F6",
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
        url: "/request?service=prescription",
      },
    ],
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
