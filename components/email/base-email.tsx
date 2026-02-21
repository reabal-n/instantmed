/**
 * BaseEmail - Premium email layout component
 *
 * Provides consistent header/footer/typography across all transactional emails.
 * Optimized for email client compatibility (inline styles, table-based layout).
 *
 * Design: Premium, modern, sleek. Dark header with wordmark. Refined typography.
 * Brand color: #0F172A (slate-900) primary with #3B82F6 (blue-500) accent.
 */

import * as React from "react"

/* eslint-disable @next/next/no-head-element -- Email templates, not Next.js pages */

// Brand colors - premium palette
const colors = {
  primary: "#0F172A",
  accent: "#3B82F6",
  accentLight: "#EFF6FF",
  background: "#F1F5F9",
  cardBg: "#ffffff",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
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
  headerBg: "#0F172A",
  headerText: "#ffffff",
  footerBg: "#F8FAFC",
}

const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

interface BaseEmailProps {
  children: React.ReactNode
  previewText?: string
  appUrl?: string
}

export function BaseEmail({ children, previewText, appUrl = "https://instantmed.com.au" }: BaseEmailProps) {
  const wordmarkUrl = `${appUrl}/branding/wordmark.png`

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
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
                  }}
                >
                  <tbody>
                    {/* Header - Dark with wordmark */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: colors.headerBg,
                          padding: "24px 32px",
                          textAlign: "center" as const,
                        }}
                      >
                        <a
                          href={appUrl}
                          style={{ textDecoration: "none", display: "inline-block" }}
                        >
                          <img
                            src={wordmarkUrl}
                            alt="InstantMed"
                            width="140"
                            height="auto"
                            style={{
                              display: "block",
                              margin: "0 auto",
                              maxWidth: "140px",
                              height: "auto",
                              filter: "brightness(0) invert(1)",
                            }}
                          />
                        </a>
                      </td>
                    </tr>

                    {/* Content */}
                    <tr>
                      <td style={{ padding: "32px 32px 36px 32px" }}>
                        {children}
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          padding: "24px 32px",
                          borderTop: `1px solid ${colors.border}`,
                          backgroundColor: colors.footerBg,
                        }}
                      >
                        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                          <tbody>
                            <tr>
                              <td style={{ textAlign: "center" as const }}>
                                <p
                                  style={{
                                    margin: "0 0 10px 0",
                                    fontSize: "12px",
                                    color: colors.textMuted,
                                    lineHeight: "1.8",
                                  }}
                                >
                                  <a href={`${appUrl}/privacy`} style={{ color: colors.textMuted, textDecoration: "none" }}>
                                    Privacy
                                  </a>
                                  <span style={{ margin: "0 8px", color: colors.border }}>|</span>
                                  <a href={`${appUrl}/terms`} style={{ color: colors.textMuted, textDecoration: "none" }}>
                                    Terms
                                  </a>
                                  <span style={{ margin: "0 8px", color: colors.border }}>|</span>
                                  <a href={`${appUrl}/contact`} style={{ color: colors.textMuted, textDecoration: "none" }}>
                                    Contact
                                  </a>
                                  <span style={{ margin: "0 8px", color: colors.border }}>|</span>
                                  <a href={`${appUrl}/account?tab=notifications`} style={{ color: colors.textMuted, textDecoration: "none" }}>
                                    Preferences
                                  </a>
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "11px",
                                    color: colors.textMuted,
                                    letterSpacing: "0.02em",
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
    h1: { fontSize: "24px", marginBottom: "16px" },
    h2: { fontSize: "18px", marginBottom: "12px" },
    h3: { fontSize: "15px", marginBottom: "8px" },
  }
  const Tag = as
  return (
    <Tag
      style={{
        margin: `0 0 ${sizes[as].marginBottom} 0`,
        fontSize: sizes[as].fontSize,
        fontWeight: "700",
        color: colors.text,
        lineHeight: "1.3",
        letterSpacing: "-0.3px",
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
        lineHeight: "1.7",
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
                padding: isPrimary ? "14px 28px" : "12px 24px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                borderRadius: "10px",
                letterSpacing: "0.01em",
                ...(isPrimary
                  ? {
                      backgroundColor: colors.accent,
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
    default: { backgroundColor: "#F8FAFC", borderColor: colors.border },
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
    success: { bg: colors.successBg, border: colors.successBorder, color: colors.success },
    info: { bg: colors.infoBg, border: colors.infoBorder, color: colors.info },
    warning: { bg: colors.warningBg, border: colors.warningBorder, color: colors.warning },
  }
  const c = config[variant]
  return (
    <div
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: "10px",
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
      <p style={{ margin: "0 0 6px 0", fontSize: "11px", color: colors.success, fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>
        Verification Code
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "22px",
          fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
          fontWeight: "bold",
          color: colors.success,
          letterSpacing: "4px",
        }}
      >
        {code}
      </p>
      {verifyUrl && (
        <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: colors.textMuted }}>
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
        lineHeight: "1.8",
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
