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
    timeZone: "Australia/Sydney",
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
    timeZone: "Australia/Sydney",
  })
}

/** "12 March 2026" */
export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney",
  })
}

/** Add N days to a date string and return as ISO date string (YYYY-MM-DD) */
export function addDays(date: string | Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]!
}

/** "12/03/2026" — DD/MM/YYYY for certificates, DOB, issue date */
export function formatShortDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Australia/Sydney",
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

/** Calculate age from date of birth string. Returns null if DOB is missing/invalid. */
export function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null
  const birthDate = new Date(dob)
  if (isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

/**
 * Format a whole-dollar AUD amount for display (e.g. 12345 → "$12,345").
 * Use this for revenue/KPI dashboards. For exact invoice amounts use formatCurrency(cents).
 */
export function formatAUD(dollars: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars)
}

/**
 * Format a past timestamp as a human-readable relative string.
 * e.g. "2 minutes ago", "3 hours ago", "2 days ago"
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

/**
 * Format a duration in minutes as a short age string.
 * e.g. 45 → "45 min", 90 → "1h 30 min"
 */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes} min` : `${hours}h`
}

/**
 * Format a nullable duration in minutes as a compact string.
 * e.g. null → "—", 45 → "45m", 90 → "1h 30m", 1500 → "1d 1h"
 */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}
