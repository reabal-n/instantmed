import localFont from "next/font/local"

/**
 * Exact Plus Jakarta Sans glyph subset used by the two primary acquisition
 * headings. Keeping this as a route-imported next/font face limits its preload
 * to pages that render the headings instead of taxing every app route.
 * Regenerate with fontTools.subset from the full Plus Jakarta Sans Latin
 * variable face using the literal Hero titles in med-cert-landing.tsx and
 * prescriptions-landing.tsx. Preserve the 200–800 weight axis and WOFF2 format.
 * e2e/front-door.spec.ts loads this file alone and checks every title glyph.
 */
export const moneyH1Font = localFont({
  src: "./plus-jakarta-money-h1.woff2",
  display: "optional",
  weight: "200 800",
  style: "normal",
  preload: true,
  fallback: ["moneyH1Font Fallback Liberation", "Plus Jakarta Sans", "Arial", "sans-serif"],
})
