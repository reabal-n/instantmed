import { formatDistanceToNow } from "date-fns"

/**
 * Shared date formatting utilities.
 * Use these instead of inline toLocaleDateString/format calls.
 */

/** "12 Mar 2026" */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** "12 Mar 2026, 3:45 PM" */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/** "12 March 2026" */
export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/** "12/03/2026" — DD/MM/YYYY for certificates, DOB, issue date */
export function formatShortDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Safe format for DOB — returns undefined if date is invalid.
 * Use when the source may be malformed (avoids "Invalid Date" on PDFs).
 */
export function formatShortDateSafe(date: string | Date | null | undefined): string | undefined {
  if (date == null || date === "") return undefined
  const d = new Date(date)
  if (isNaN(d.getTime())) return undefined
  return formatShortDate(d)
}

/** "3 hours ago" */
export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

/** "$29.95" from cents */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
