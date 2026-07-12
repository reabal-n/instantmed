const AUD_DOLLARS = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format a value that is already denominated in Australian dollars.
 *
 * Google Ads GAQL helpers expose dollar values (not cents), so callers must
 * not divide these values by 100 before display.
 */
export function formatAudDollars(value: number | null | undefined): string {
  return value == null ? "No data" : AUD_DOLLARS.format(value)
}
