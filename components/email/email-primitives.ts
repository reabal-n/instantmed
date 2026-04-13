/**
 * Email design primitives - shared constants for all email templates.
 *
 * Brand colors aligned with Morning Canvas design system +
 * system sans-serif font stack (web fonts get stripped by most email clients).
 */

// Brand colors - aligned with Morning Canvas design system
export const colors = {
  // Core
  primary: "#1E293B",       // Slate-800 - headings, key text (matches --text)
  accent: "#2563EB",        // Blue-600 - buttons, links, active (matches --blue)
  accentHover: "#1D4ED8",   // Blue-700
  accentLight: "#EFF6FF",   // Blue-50 - accent backgrounds
  accentBorder: "#BFDBFE",  // Blue-200

  // Surfaces
  background: "#F8F7F4",    // Warm ivory - outer background (matches --bg)
  cardBg: "#ffffff",
  surfaceSubtle: "#F5F7F9", // Mist-100 - info boxes (matches --elevated)
  surfaceWarm: "#F8F7F4",   // Warm ivory - footer background

  // Typography
  text: "#1E293B",          // Slate-800 - headings (matches --text)
  textBody: "#475569",      // Slate-600 - body text (matches --muted)
  textSecondary: "#64748B", // Slate-500 - secondary
  textMuted: "#94A3B8",     // Slate-400 - footer, fine print

  // Borders
  border: "#E2E8F0",        // Slate-200
  borderLight: "#F1F5F9",   // Slate-100
  divider: "#E2E8F0",       // Slate-200

  // Status
  success: "#15803D",       // Green-700 (matches --green)
  successBg: "#F0FDF4",     // Green-50
  successBorder: "#BBF7D0", // Green-200
  successText: "#15803D",   // Green-700

  info: "#2563EB",          // Blue-600 (matches --blue)
  infoBg: "#EFF6FF",        // Blue-50
  infoBorder: "#BFDBFE",    // Blue-200
  infoText: "#1D4ED8",      // Blue-700

  warning: "#B45309",       // Amber-700 (matches --amber)
  warningBg: "#FFFBEB",     // Amber-50
  warningBorder: "#FDE68A", // Amber-200
  warningText: "#92400E",   // Amber-800

  error: "#DC2626",         // Red-600 (matches --coral)
  errorBg: "#FEF2F2",       // Red-50
  errorBorder: "#FECACA",   // Red-200
  errorText: "#991B1B",     // Red-800
}

// System sans-serif stack - web fonts get stripped by most email clients, causing serif fallback
export const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
