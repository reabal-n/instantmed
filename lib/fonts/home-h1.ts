import localFont from "next/font/local"

/**
 * Plus Jakarta Sans subset for the canonical homepage tagline, including G/P.
 * Importing it here limits the preload to the homepage. Swap ensures a slow
 * first visit still renders the brand face once this small file arrives.
 */
export const homeH1Font = localFont({
  src: "./plus-jakarta-home-h1.woff2",
  display: "swap",
  weight: "200 800",
  style: "normal",
  preload: true,
  fallback: ["Plus Jakarta Sans", "Arial", "sans-serif"],
})
