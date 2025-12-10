import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InstantMed - Online Doctor Consultations",
    short_name: "InstantMed",
    description:
      "Get medical certificates, prescriptions, and referrals online from AHPRA-registered Australian GPs. Same-day response, 7 days a week.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbfc",
    theme_color: "#00E2B5",
    orientation: "portrait-primary",
    scope: "/",
    lang: "en-AU",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "InstantMed Homepage",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "InstantMed Mobile View",
      },
    ],
    shortcuts: [
      {
        name: "Medical Certificate",
        short_name: "Med Cert",
        description: "Request a medical certificate",
        url: "/medical-certificate/request",
        icons: [{ src: "/shortcuts/med-cert.png", sizes: "96x96" }],
      },
      {
        name: "Prescriptions",
        short_name: "Scripts",
        description: "Request a prescription",
        url: "/prescriptions/request",
        icons: [{ src: "/shortcuts/prescription.png", sizes: "96x96" }],
      },
      {
        name: "My Requests",
        short_name: "Requests",
        description: "View your requests",
        url: "/patient/requests",
        icons: [{ src: "/shortcuts/requests.png", sizes: "96x96" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  }
}
