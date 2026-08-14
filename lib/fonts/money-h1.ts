import localFont from "next/font/local"

/**
 * Exact Plus Jakarta Sans glyph subset used by the two primary acquisition
 * headings. Keeping this as a route-imported next/font face limits its preload
 * to pages that render the headings instead of taxing every app route.
 */
export const moneyH1Font = localFont({
  src: "./plus-jakarta-money-h1.woff2",
  display: "optional",
  weight: "200 800",
  style: "normal",
  preload: true,
  fallback: ["Plus Jakarta Sans", "Arial", "sans-serif"],
})
