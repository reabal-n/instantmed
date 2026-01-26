/**
 * BaseEmail - Premium email layout component
 * 
 * Provides consistent header/footer/typography across all transactional emails.
 * Optimized for email client compatibility (inline styles, table-based layout).
 */

import * as React from "react"

/* eslint-disable @next/next/no-head-element -- Email templates, not Next.js pages */

// Brand colors
const colors = {
  primary: "#00C9A7",       // InstantMed teal
  primaryDark: "#00A88A",
  background: "#f9fafb",
  cardBg: "#ffffff",
  text: "#1f2937",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "#e5e7eb",
  success: "#166534",
  successBg: "#dcfce7",
  successBorder: "#bbf7d0",
  info: "#1e40af",
  infoBg: "#dbeafe",
  warning: "#92400e",
  warningBg: "#fef3c7",
  error: "#991b1b",
  errorBg: "#fef2f2",
}

// Shared styles
const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

interface BaseEmailProps {
  children: React.ReactNode
  previewText?: string  // Hidden preview text for email clients
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
        {/* Preview text (hidden) */}
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
            {/* Invisible characters to prevent email clients from showing body preview */}
            {"\u00A0\u200C".repeat(100)}
          </div>
        )}

        {/* Main container */}
        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          style={{
            width: "100%",
            backgroundColor: colors.background,
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "24px 16px" }}>
                {/* Content card */}
                <table
                  role="presentation"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    maxWidth: "600px",
                    margin: "0 auto",
                    backgroundColor: colors.cardBg,
                    borderRadius: "16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td style={{ padding: "32px 32px 24px 32px", textAlign: "center" }}>
                        <a
                          href={appUrl}
                          style={{
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "28px",
                              fontWeight: "700",
                              color: colors.primary,
                              letterSpacing: "-0.5px",
                            }}
                          >
                            InstantMed
                          </span>
                        </a>
                      </td>
                    </tr>

                    {/* Content */}
                    <tr>
                      <td style={{ padding: "0 32px 32px 32px" }}>
                        {children}
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          padding: "24px 32px",
                          borderTop: `1px solid ${colors.border}`,
                          backgroundColor: "#fafafa",
                        }}
                      >
                        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                          <tbody>
                            <tr>
                              <td style={{ textAlign: "center" }}>
                                <p
                                  style={{
                                    margin: "0 0 12px 0",
                                    fontSize: "13px",
                                    color: colors.textLight,
                                  }}
                                >
                                  <a href={`${appUrl}/privacy`} style={{ color: colors.textMuted, textDecoration: "none" }}>
                                    Privacy
                                  </a>
                                  {" · "}
                                  <a href={`${appUrl}/terms`} style={{ color: colors.textMuted, textDecoration: "none" }}>
                                    Terms
                                  </a>
                                  {" · "}
                                  <a href={`${appUrl}/contact`} style={{ color: colors.textMuted, textDecoration: "none" }}>
                                    Contact
                                  </a>
                                  {" · "}
                                  <a href={`${appUrl}/account?tab=notifications`} style={{ color: colors.textMuted, textDecoration: "none" }}>
                                    Email Preferences
                                  </a>
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "12px",
                                    color: colors.textLight,
                                  }}
                                >
                                  InstantMed Pty Ltd · Australia
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

// Reusable email components

interface HeadingProps {
  children: React.ReactNode
  as?: "h1" | "h2" | "h3"
}

export function Heading({ children, as = "h1" }: HeadingProps) {
  const sizes = {
    h1: { fontSize: "24px", marginBottom: "16px" },
    h2: { fontSize: "20px", marginBottom: "12px" },
    h3: { fontSize: "16px", marginBottom: "8px" },
  }
  const Tag = as
  return (
    <Tag
      style={{
        margin: `0 0 ${sizes[as].marginBottom} 0`,
        fontSize: sizes[as].fontSize,
        fontWeight: "600",
        color: colors.text,
        lineHeight: "1.3",
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
        fontSize: small ? "14px" : "16px",
        color: muted ? colors.textMuted : colors.text,
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
                padding: "14px 28px",
                fontSize: "16px",
                fontWeight: "600",
                textDecoration: "none",
                borderRadius: "999px",
                ...(isPrimary
                  ? {
                      background: `linear-gradient(135deg, #00E2B5, ${colors.primary})`,
                      color: "#0A0F1C",
                    }
                  : {
                      backgroundColor: "#f3f4f6",
                      color: colors.text,
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
    default: { backgroundColor: "#f8fafc", borderColor: colors.border },
    success: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    info: { backgroundColor: colors.infoBg, borderColor: "#bfdbfe" },
    warning: { backgroundColor: colors.warningBg, borderColor: "#fde68a" },
    error: { backgroundColor: colors.errorBg, borderColor: "#fecaca" },
  }
  const styles = variantStyles[variant]
  return (
    <div
      style={{
        backgroundColor: styles.backgroundColor,
        border: `1px solid ${styles.borderColor}`,
        borderRadius: "12px",
        padding: "20px",
        margin: "24px 0",
      }}
    >
      {children}
    </div>
  )
}

interface SuccessBannerProps {
  icon?: string
  title: string
}

export function SuccessBanner({ icon = "✓", title }: SuccessBannerProps) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #dcfce7, #d1fae5)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "48px", display: "block", marginBottom: "8px" }}>{icon}</span>
      <h1
        style={{
          color: colors.success,
          fontSize: "24px",
          margin: 0,
          fontWeight: "600",
        }}
      >
        {title}
      </h1>
    </div>
  )
}

interface VerificationCodeProps {
  code: string
  verifyUrl?: string
}

export function VerificationCode({ code, verifyUrl }: VerificationCodeProps) {
  return (
    <Box variant="success">
      <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: colors.success, fontWeight: "600" }}>
        Verification Code
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "22px",
          fontFamily: "monospace",
          fontWeight: "bold",
          color: "#15803d",
          letterSpacing: "2px",
        }}
      >
        {code}
      </p>
      {verifyUrl && (
        <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: colors.success }}>
          Employers can verify at{" "}
          <a href={verifyUrl} style={{ color: "#16a34a" }}>
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
        color: colors.textMuted,
        fontSize: "14px",
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: i < items.length - 1 ? "8px" : 0 }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

// Export colors for use in templates
export { colors, fontFamily }
