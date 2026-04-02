/**
 * BaseEmail — Premium email layout component
 *
 * Provides consistent header/footer/typography across all transactional emails.
 * Optimized for email client compatibility (inline styles, table-based layout).
 *
 * Design: Refined, warm, premium. Clean white canvas with generous whitespace.
 * Subtle Morning Spectrum palette — soft warmth with clinical trust.
 */

import * as React from "react"
import { COMPANY_NAME, ABN } from "@/lib/constants"

/* eslint-disable @next/next/no-head-element -- Email templates, not Next.js pages */

// Brand colors — aligned with Morning Canvas design system
const colors = {
  // Core
  primary: "#1E293B",       // Slate-800 — headings, key text (matches --text)
  accent: "#2563EB",        // Blue-600 — buttons, links, active (matches --blue)
  accentHover: "#1D4ED8",   // Blue-700
  accentLight: "#EFF6FF",   // Blue-50 — accent backgrounds
  accentBorder: "#BFDBFE",  // Blue-200

  // Surfaces
  background: "#F8F7F4",    // Warm ivory — outer background (matches --bg)
  cardBg: "#ffffff",
  surfaceSubtle: "#F5F7F9", // Mist-100 — info boxes (matches --elevated)
  surfaceWarm: "#F8F7F4",   // Warm ivory — footer background

  // Typography
  text: "#1E293B",          // Slate-800 — headings (matches --text)
  textBody: "#475569",      // Slate-600 — body text (matches --muted)
  textSecondary: "#64748B", // Slate-500 — secondary
  textMuted: "#94A3B8",     // Slate-400 — footer, fine print

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

// System sans-serif stack — web fonts get stripped by most email clients, causing serif fallback
const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

interface BaseEmailProps {
  children: React.ReactNode
  previewText?: string
  appUrl?: string
}

export function BaseEmail({ children, previewText, appUrl = "https://instantmed.com.au" }: BaseEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
{/* No web fonts — email clients strip <link> tags, causing serif fallback */}
        <title>InstantMed</title>
        <style>{`
          body, td, p, h1, h2, h3, a, span, div, li {
            font-family: ${fontFamily} !important;
          }
          @media (prefers-color-scheme: dark) {
            body { background-color: #0f0f0f !important; }
            .email-card, .email-card td {
              background-color: #1a1a1a !important;
              border-color: #333 !important;
              box-shadow: 0 4px 24px rgba(0,0,0,0.4) !important;
            }
            .email-content { background-color: #1a1a1a !important; }
            .email-footer { background-color: #0f0f0f !important; border-top-color: #333 !important; }
            .email-card, .email-card p, .email-card td, .email-card li, .email-card h1, .email-card h2, .email-card h3, .email-card span {
              color: #e5e5e5 !important;
            }
            .email-card a { color: #60A5FA !important; }
          }
        `}</style>
      </head>
      <body
        style={{
          fontFamily,
          lineHeight: "1.6",
          color: colors.textBody,
          margin: 0,
          padding: 0,
          backgroundColor: colors.background,
          WebkitTextSizeAdjust: "100%",
        }}
        data-x-apple-data-detectors="false"
      >
        {previewText && (
          <div
            style={{
              display: "none",
              maxHeight: 0,
              overflow: "hidden",
              fontSize: "1px",
              lineHeight: "1px",
              color: colors.background,
            }}
          >
            {previewText}
            {"\u00A0\u200C".repeat(100)}
          </div>
        )}

        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          style={{ width: "100%", backgroundColor: colors.background }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "48px 16px" }}>
                <table
                  role="presentation"
                  cellPadding="0"
                  cellSpacing="0"
                  className="email-card"
                  style={{
                    maxWidth: "480px",
                    margin: "0 auto",
                    backgroundColor: colors.cardBg,
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: `1px solid ${colors.border}`,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                  }}
                >
                  <tbody>
                    {/* Header — Logo + Wordmark */}
                    <tr>
                      <td
                        style={{
                          padding: "40px 40px 24px 40px",
                          textAlign: "center",
                        }}
                      >
                        <a
                          href={appUrl}
                          style={{
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                        >
                          <table role="presentation" cellPadding="0" cellSpacing="0" style={{ margin: "0 auto" }}>
                            <tbody>
                              <tr>
                                <td style={{ verticalAlign: "middle", paddingRight: "10px" }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`${appUrl}/branding/logo.png`}
                                    alt="InstantMed"
                                    width="36"
                                    height="36"
                                    style={{
                                      display: "block",
                                      border: "0",
                                      outline: "none",
                                      width: "36px",
                                      height: "36px",
                                      borderRadius: "8px",
                                    }}
                                  />
                                </td>
                                <td style={{ verticalAlign: "middle" }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`${appUrl}/branding/wordmark.png`}
                                    alt="InstantMed"
                                    width="130"
                                    height="auto"
                                    style={{
                                      display: "block",
                                      border: "0",
                                      outline: "none",
                                      maxWidth: "130px",
                                      height: "auto",
                                    }}
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </a>
                      </td>
                    </tr>

                    {/* Subtle divider */}
                    <tr>
                      <td style={{ padding: "0 40px" }}>
                        <div style={{ borderTop: `1px solid ${colors.borderLight}` }} />
                      </td>
                    </tr>

                    {/* Content */}
                    <tr>
                      <td
                        className="email-content"
                        style={{
                          padding: "32px 40px 40px 40px",
                          backgroundColor: colors.cardBg,
                        }}
                      >
                        {children}
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        className="email-footer"
                        style={{
                          padding: "32px 40px",
                          borderTop: `1px solid ${colors.borderLight}`,
                          backgroundColor: colors.surfaceWarm,
                        }}
                      >
                        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                          <tbody>
                            <tr>
                              <td style={{ textAlign: "center" as const }}>
                                <p
                                  style={{
                                    margin: "0 0 16px 0",
                                    fontSize: "12px",
                                    color: colors.textSecondary,
                                    lineHeight: "1.8",
                                  }}
                                >
                                  <a href={`${appUrl}/privacy`} style={{ color: colors.textSecondary, textDecoration: "none" }}>
                                    Privacy
                                  </a>
                                  <span style={{ margin: "0 8px", color: colors.border }}>·</span>
                                  <a href={`${appUrl}/terms`} style={{ color: colors.textSecondary, textDecoration: "none" }}>
                                    Terms
                                  </a>
                                  <span style={{ margin: "0 8px", color: colors.border }}>·</span>
                                  <a href={`${appUrl}/contact`} style={{ color: colors.textSecondary, textDecoration: "none" }}>
                                    Contact
                                  </a>
                                  <span style={{ margin: "0 8px", color: colors.border }}>·</span>
                                  <a href={`${appUrl}/account?tab=notifications`} style={{ color: colors.textSecondary, textDecoration: "none" }}>
                                    Preferences
                                  </a>
                                </p>
                                <p
                                  style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "12px",
                                    color: colors.textSecondary,
                                  }}
                                >
                                  Made with care in Australia 🌤️
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "11px",
                                    color: colors.textMuted,
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  {COMPANY_NAME} · ABN {ABN}
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}

// --- Reusable Email Components ---

interface HeadingProps {
  children: React.ReactNode
  as?: "h1" | "h2" | "h3"
}

export function Heading({ children, as = "h1" }: HeadingProps) {
  const sizes = {
    h1: { fontSize: "24px", marginBottom: "16px", letterSpacing: "-0.5px" },
    h2: { fontSize: "18px", marginBottom: "12px", letterSpacing: "-0.3px" },
    h3: { fontSize: "15px", marginBottom: "10px", letterSpacing: "-0.1px" },
  }
  const Tag = as
  return (
    <Tag
      style={{
        margin: `0 0 ${sizes[as].marginBottom} 0`,
        fontSize: sizes[as].fontSize,
        fontWeight: "600",
        color: colors.text,
        lineHeight: "1.5",
        letterSpacing: sizes[as].letterSpacing,
      }}
    >
      {children}
    </Tag>
  )
}

interface TextProps {
  children: React.ReactNode
  muted?: boolean
  small?: boolean
  style?: React.CSSProperties
}

export function Text({ children, muted, small, style }: TextProps) {
  return (
    <p
      style={{
        margin: "0 0 12px 0",
        fontSize: small ? "13px" : "15px",
        color: muted ? colors.textMuted : colors.textBody,
        lineHeight: "1.6",
        ...style,
      }}
    >
      {children}
    </p>
  )
}

interface ButtonProps {
  href: string
  children: React.ReactNode
  variant?: "primary" | "secondary"
}

export function Button({ href, children, variant = "primary" }: ButtonProps) {
  const isPrimary = variant === "primary"
  return (
    <table role="presentation" cellPadding="0" cellSpacing="0" style={{ margin: "16px auto", width: "100%" }}>
      <tbody>
        <tr>
          <td style={{ textAlign: "center" as const }}>
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: isPrimary ? "14px 32px" : "12px 28px",
                fontSize: "15px",
                fontWeight: "600",
                textDecoration: "none",
                borderRadius: "12px",
                letterSpacing: "0.01em",
                boxShadow: isPrimary ? "0 2px 8px rgba(37,99,235,0.25)" : "none",
                ...(isPrimary
                  ? {
                      backgroundColor: colors.accent,
                      color: "#ffffff",
                    }
                  : {
                      backgroundColor: "transparent",
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }),
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

interface BoxProps {
  children: React.ReactNode
  variant?: "default" | "success" | "info" | "warning" | "error"
}

export function Box({ children, variant = "default" }: BoxProps) {
  const variantStyles = {
    default: { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
    success: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    info: { backgroundColor: colors.infoBg, borderColor: colors.infoBorder },
    warning: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
    error: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
  }
  const styles = variantStyles[variant]
  return (
    <div
      style={{
        backgroundColor: styles.backgroundColor,
        border: `1px solid ${styles.borderColor}`,
        borderRadius: "10px",
        padding: "16px 20px",
        margin: "14px 0",
      }}
    >
      {children}
    </div>
  )
}

interface StatusBannerProps {
  title: string
  variant?: "success" | "info" | "warning"
}

export function StatusBanner({ title, variant = "success" }: StatusBannerProps) {
  const config = {
    success: { bg: colors.successBg, border: colors.successBorder, color: colors.successText, icon: "✓" },
    info: { bg: colors.infoBg, border: colors.infoBorder, color: colors.infoText, icon: "ℹ" },
    warning: { bg: colors.warningBg, border: colors.warningBorder, color: colors.warningText, icon: "!" },
  }
  const c = config[variant]
  return (
    <div
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: "10px",
        padding: "12px 18px",
        marginBottom: "14px",
        display: "flex",
      }}
    >
      <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td style={{ width: "28px", verticalAlign: "middle" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: c.color,
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  lineHeight: "22px",
                  textAlign: "center" as const,
                }}
              >
                {c.icon}
              </div>
            </td>
            <td style={{ verticalAlign: "middle" }}>
              <p
                style={{
                  color: c.color,
                  fontSize: "14px",
                  margin: 0,
                  fontWeight: "600",
                  lineHeight: "1.4",
                }}
              >
                {title}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// Keep SuccessBanner for backwards compatibility
interface SuccessBannerProps2 {
  icon?: string
  title: string
}

export function SuccessBanner({ title }: SuccessBannerProps2) {
  return <StatusBanner title={title} variant="success" />
}

interface VerificationCodeProps {
  code: string
  verifyUrl?: string
}

export function VerificationCode({ code, verifyUrl }: VerificationCodeProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surfaceSubtle,
        border: `1px solid ${colors.border}`,
        borderRadius: "10px",
        padding: "16px 20px",
        margin: "14px 0",
        textAlign: "center" as const,
      }}
    >
      <p style={{ margin: "0 0 4px 0", fontSize: "11px", color: colors.textSecondary, fontWeight: "600", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
        Verification Code
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "22px",
          fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
          fontWeight: "700",
          color: colors.text,
          letterSpacing: "4px",
        }}
      >
        {code}
      </p>
      {verifyUrl && (
        <p style={{ margin: "12px 0 0 0", fontSize: "12px", color: colors.textMuted }}>
          Verify at{" "}
          <a href={verifyUrl} style={{ color: colors.accent, textDecoration: "none" }}>
            {verifyUrl.replace("https://", "")}
          </a>
        </p>
      )}
    </div>
  )
}

interface ListProps {
  items: string[]
}

export function List({ items }: ListProps) {
  return (
    <ul
      style={{
        margin: "0",
        paddingLeft: "20px",
        color: colors.textBody,
        fontSize: "14px",
        lineHeight: "1.8",
        listStyleType: "disc",
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: i < items.length - 1 ? "8px" : 0, paddingLeft: "4px" }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

// Horizontal rule/divider component
export function Divider() {
  return (
    <div style={{ borderTop: `1px solid ${colors.borderLight}`, margin: "32px 0" }} />
  )
}

// Detail row for receipt-style tables
interface DetailRowProps {
  label: string
  value: string
  mono?: boolean
  bold?: boolean
}

export function DetailRow({ label, value, mono, bold }: DetailRowProps) {
  return (
    <tr>
      <td style={{ padding: "12px 0", color: colors.textSecondary, fontSize: "14px", borderBottom: `1px solid ${colors.borderLight}` }}>
        {label}
      </td>
      <td
        style={{
          padding: "12px 0",
          fontSize: mono ? "13px" : "14px",
          fontWeight: bold ? 600 : 400,
          fontFamily: mono ? "'SF Mono', 'Fira Code', Consolas, monospace" : "inherit",
          textAlign: "right" as const,
          color: colors.text,
          borderBottom: `1px solid ${colors.borderLight}`,
          letterSpacing: mono ? "0.5px" : "inherit",
        }}
      >
        {value}
      </td>
    </tr>
  )
}

// Hero block — centered icon + headline + subtitle for email headers
interface HeroBlockProps {
  icon: string
  headline: string
  subtitle?: string
  variant?: "success" | "info" | "warning" | "neutral"
}

export function HeroBlock({ icon, headline, subtitle, variant = "info" }: HeroBlockProps) {
  const variantStyles = {
    success: { bg: colors.successBg, border: colors.successBorder, iconColor: colors.successText },
    info: { bg: colors.infoBg, border: colors.infoBorder, iconColor: colors.infoText },
    warning: { bg: colors.warningBg, border: colors.warningBorder, iconColor: colors.warningText },
    neutral: { bg: colors.surfaceSubtle, border: colors.border, iconColor: colors.textSecondary },
  }
  const s = variantStyles[variant]
  return (
    <div style={{ textAlign: "center" as const, padding: "0 0 20px" }}>
      <div
        style={{
          display: "inline-block",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: s.bg,
          border: `1px solid ${s.border}`,
          lineHeight: "48px",
          textAlign: "center" as const,
          fontSize: "22px",
          color: s.iconColor,
          marginBottom: "12px",
        }}
      >
        {icon}
      </div>
      <h1
        style={{
          margin: subtitle ? "0 0 4px 0" : "0",
          fontSize: "22px",
          fontWeight: "700",
          color: colors.text,
          letterSpacing: "-0.4px",
          lineHeight: "1.4",
        }}
      >
        {headline}
      </h1>
      {subtitle && (
        <p style={{ margin: 0, fontSize: "13px", color: colors.textMuted }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

interface GoogleReviewCTAProps {
  href: string
}

export function GoogleReviewCTA({ href }: GoogleReviewCTAProps) {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "16px 0 4px",
        borderTop: `1px solid ${colors.borderLight}`,
        margin: "4px 0 0 0",
      }}
    >
      <p style={{ margin: 0, fontSize: "14px", color: colors.textBody, lineHeight: "1.6" }}>
        ⭐ Happy with InstantMed?{" "}
        <a href={href} style={{ color: colors.accent, fontWeight: 600, textDecoration: "none" }}>
          Leave a quick Google review
        </a>
        {" "}— takes 30 seconds.
      </p>
    </div>
  )
}

// Export colors for use in templates
export { colors, fontFamily }
