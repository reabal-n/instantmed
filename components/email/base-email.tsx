/**
 * BaseEmail - Premium email layout component
 * 
 * Provides consistent header/footer/typography across all transactional emails.
 * Optimized for email client compatibility (inline styles, table-based layout).
 * 
 * Design: Clean, minimal, professional. No gradients on body elements.
 * Brand color: #1A1A1A (dark) with #3B82F6 (blue) accent.
 */

import * as React from "react"

/* eslint-disable @next/next/no-head-element -- Email templates, not Next.js pages */

// Brand colors - refined, premium palette
const colors = {
  primary: "#1A1A1A",
  accent: "#3B82F6",
  accentLight: "#EFF6FF",
  background: "#F8F9FA",
  cardBg: "#ffffff",
  text: "#1A1A1A",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  success: "#059669",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",
  info: "#2563EB",
  infoBg: "#EFF6FF",
  infoBorder: "#BFDBFE",
  warning: "#D97706",
  warningBg: "#FFFBEB",
  warningBorder: "#FDE68A",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
}

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
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>InstantMed</title>
      </head>
      <body
        style={{
          fontFamily,
          lineHeight: "1.6",
          color: colors.text,
          margin: 0,
          padding: 0,
          backgroundColor: colors.background,
          WebkitTextSizeAdjust: "100%",
        }}
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
              <td style={{ padding: "40px 16px" }}>
                <table
                  role="presentation"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    maxWidth: "560px",
                    margin: "0 auto",
                    backgroundColor: colors.cardBg,
                    borderRadius: "12px",
                    border: `1px solid ${colors.border}`,
                    overflow: "hidden",
                  }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td style={{ padding: "28px 32px 20px 32px" }}>
                        <a
                          href={appUrl}
                          style={{ textDecoration: "none", display: "inline-block" }}
                        >
                          <span
                            style={{
                              fontSize: "18px",
                              fontWeight: "700",
                              color: colors.primary,
                              letterSpacing: "-0.3px",
                            }}
                          >
                            InstantMed
                          </span>
                        </a>
                      </td>
                    </tr>

                    {/* Divider */}
                    <tr>
                      <td style={{ padding: "0 32px" }}>
                        <div style={{ borderTop: `1px solid ${colors.borderLight}` }} />
                      </td>
                    </tr>

                    {/* Content */}
                    <tr>
                      <td style={{ padding: "24px 32px 32px 32px" }}>
                        {children}
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          padding: "20px 32px",
                          borderTop: `1px solid ${colors.borderLight}`,
                          backgroundColor: "#FAFAFA",
                        }}
                      >
                        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                          <tbody>
                            <tr>
                              <td style={{ textAlign: "center" }}>
                                <p
                                  style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "12px",
                                    color: colors.textMuted,
                                    lineHeight: "1.6",
                                  }}
                                >
                                  <a href={`${appUrl}/privacy`} style={{ color: colors.textMuted, textDecoration: "underline" }}>
                                    Privacy
                                  </a>
                                  {"  ·  "}
                                  <a href={`${appUrl}/terms`} style={{ color: colors.textMuted, textDecoration: "underline" }}>
                                    Terms
                                  </a>
                                  {"  ·  "}
                                  <a href={`${appUrl}/contact`} style={{ color: colors.textMuted, textDecoration: "underline" }}>
                                    Contact
                                  </a>
                                  {"  ·  "}
                                  <a href={`${appUrl}/account?tab=notifications`} style={{ color: colors.textMuted, textDecoration: "underline" }}>
                                    Preferences
                                  </a>
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "11px",
                                    color: colors.textMuted,
                                  }}
                                >
                                  InstantMed Pty Ltd · ABN 64 694 559 334 · Australia
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
    h1: { fontSize: "22px", marginBottom: "16px" },
    h2: { fontSize: "18px", marginBottom: "12px" },
    h3: { fontSize: "15px", marginBottom: "8px" },
  }
  const Tag = as
  return (
    <Tag
      style={{
        margin: `0 0 ${sizes[as].marginBottom} 0`,
        fontSize: sizes[as].fontSize,
        fontWeight: "600",
        color: colors.text,
        lineHeight: "1.35",
        letterSpacing: "-0.2px",
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
        margin: "0 0 16px 0",
        fontSize: small ? "13px" : "15px",
        color: muted ? colors.textMuted : colors.textSecondary,
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
    <table role="presentation" cellPadding="0" cellSpacing="0" style={{ margin: "24px 0" }}>
      <tbody>
        <tr>
          <td>
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: isPrimary ? "12px 24px" : "10px 20px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                borderRadius: "8px",
                letterSpacing: "0.01em",
                ...(isPrimary
                  ? {
                      backgroundColor: colors.primary,
                      color: "#ffffff",
                    }
                  : {
                      backgroundColor: colors.borderLight,
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
    default: { backgroundColor: "#F9FAFB", borderColor: colors.border },
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
        borderRadius: "8px",
        padding: "16px",
        margin: "20px 0",
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
    success: { bg: colors.successBg, border: colors.successBorder, color: colors.success, icon: "check_circle" },
    info: { bg: colors.infoBg, border: colors.infoBorder, color: colors.info, icon: "info" },
    warning: { bg: colors.warningBg, border: colors.warningBorder, color: colors.warning, icon: "warning" },
  }
  const c = config[variant]
  return (
    <div
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: "8px",
        padding: "16px 20px",
        marginBottom: "24px",
      }}
    >
      <p
        style={{
          color: c.color,
          fontSize: "15px",
          margin: 0,
          fontWeight: "600",
          lineHeight: "1.4",
        }}
      >
        {title}
      </p>
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
    <Box variant="success">
      <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: colors.success, fontWeight: "600", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
        Verification Code
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "20px",
          fontFamily: "monospace",
          fontWeight: "bold",
          color: colors.success,
          letterSpacing: "3px",
        }}
      >
        {code}
      </p>
      {verifyUrl && (
        <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: colors.textMuted }}>
          Employers can verify at{" "}
          <a href={verifyUrl} style={{ color: colors.accent }}>
            {verifyUrl.replace("https://", "")}
          </a>
        </p>
      )}
    </Box>
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
        color: colors.textSecondary,
        fontSize: "14px",
        lineHeight: "1.7",
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: i < items.length - 1 ? "6px" : 0 }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

// Export colors for use in templates
export { colors, fontFamily }
