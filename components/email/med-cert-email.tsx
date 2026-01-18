/**
 * Medical Certificate Email Template
 * 
 * React component that renders a professional email template for medical certificates.
 * This component returns JSX that can be rendered to HTML string for email sending.
 */

import React from "react"

interface MedCertEmailProps {
  patientName: string
  dashboardUrl: string
}

export function MedCertEmail({ patientName, dashboardUrl }: MedCertEmailProps) {
  return (
    <html>
      {/* eslint-disable-next-line @next/next/no-head-element -- Email template, not Next.js page */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          lineHeight: "1.6",
          color: "#333",
          maxWidth: "600px",
          margin: "0 auto",
          padding: "20px",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#00C9A7",
                marginBottom: "8px",
              }}
            >
              InstantMed
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              Telehealth Medical Certificates
            </div>
          </div>

          {/* Success Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #dcfce7, #d1fae5)",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "48px" }}>✓</span>
            <h1
              style={{
                color: "#166534",
                fontSize: "24px",
                margin: "16px 0 0 0",
                fontWeight: "600",
              }}
            >
              Your medical certificate is ready
            </h1>
          </div>

          {/* Greeting */}
          <p style={{ fontSize: "16px", marginBottom: "16px" }}>Hi {patientName},</p>

          <p style={{ fontSize: "16px", marginBottom: "24px" }}>
            Your Medical Certificate from InstantMed is ready to download from your dashboard.
          </p>

          {/* CTA Button */}
          <div style={{ textAlign: "center", margin: "32px 0" }}>
            <a
              href={dashboardUrl}
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #00E2B5, #00C9A7)",
                color: "#0A0F1C",
                padding: "14px 32px",
                borderRadius: "999px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "16px",
              }}
            >
              View Dashboard
            </a>
          </div>

          {/* What's Next */}
          <div
            style={{
              background: "#f8fafc",
              borderRadius: "12px",
              padding: "20px",
              margin: "24px 0",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px 0",
                color: "#0A0F1C",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              What happens next?
            </h3>
            <ul
              style={{
                margin: "0",
                paddingLeft: "20px",
                color: "#475569",
                fontSize: "14px",
              }}
            >
              <li style={{ marginBottom: "8px" }}>
                Download your certificate from your dashboard
              </li>
              <li style={{ marginBottom: "8px" }}>
                Forward it to your employer, university, or relevant institution
              </li>
              <li>Keep a copy for your records</li>
            </ul>
          </div>

          {/* Help */}
          <p style={{ fontSize: "14px", color: "#666", marginTop: "24px" }}>
            Questions? Just reply to this email or visit our{" "}
            <a
              href={`${dashboardUrl.split("/patient")[0]}/contact`}
              style={{ color: "#00C9A7", fontWeight: "500" }}
            >
              help center
            </a>
            .
          </p>

          {/* Footer */}
          <hr
            style={{
              border: "none",
              borderTop: "1px solid #e5e7eb",
              margin: "32px 0 24px 0",
            }}
          />

          <p
            style={{
              color: "#9ca3af",
              fontSize: "12px",
              textAlign: "center",
              margin: "0",
            }}
          >
            InstantMed Pty Ltd · Australia
            <br />
            <a
              href={`${dashboardUrl.split("/patient")[0]}/privacy`}
              style={{ color: "#9ca3af" }}
            >
              Privacy
            </a>{" "}
            ·{" "}
            <a
              href={`${dashboardUrl.split("/patient")[0]}/terms`}
              style={{ color: "#9ca3af" }}
            >
              Terms
            </a>
          </p>
        </div>
      </body>
    </html>
  )
}

/**
 * Render the email component to HTML string
 */
export function renderMedCertEmailToHtml(props: MedCertEmailProps): string {
  // Simple React render to string (for server-side)
  // In a real implementation, you might use react-dom/server's renderToString
  // For now, we'll return a template string that matches the component structure
  
  const { patientName, dashboardUrl } = props
  const baseUrl = dashboardUrl.split("/patient")[0]

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 24px; font-weight: bold; color: #00C9A7; margin-bottom: 8px;">
        InstantMed
      </div>
      <div style="font-size: 12px; color: #6b7280;">
        Telehealth Medical Certificates
      </div>
    </div>
    
    <!-- Success Banner -->
    <div style="background: linear-gradient(135deg, #dcfce7, #d1fae5); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 48px;">✓</span>
      <h1 style="color: #166534; font-size: 24px; margin: 16px 0 0 0; font-weight: 600;">
        Your medical certificate is ready
      </h1>
    </div>
    
    <!-- Greeting -->
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${patientName},</p>
    
    <p style="font-size: 16px; margin-bottom: 24px;">
      Your Medical Certificate from InstantMed is ready to download from your dashboard.
    </p>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #00E2B5, #00C9A7); color: #0A0F1C; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View Dashboard
      </a>
    </div>
    
    <!-- What's Next -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #0A0F1C; font-size: 16px; font-weight: 600;">What happens next?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li style="margin-bottom: 8px;">Download your certificate from your dashboard</li>
        <li style="margin-bottom: 8px;">Forward it to your employer, university, or relevant institution</li>
        <li>Keep a copy for your records</li>
      </ul>
    </div>
    
    <!-- Help -->
    <p style="font-size: 14px; color: #666; margin-top: 24px;">
      Questions? Just reply to this email or visit our <a href="${baseUrl}/contact" style="color: #00C9A7; font-weight: 500;">help center</a>.
    </p>
    
    <!-- Footer -->
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px 0;" />
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      InstantMed Pty Ltd · Australia<br>
      <a href="${baseUrl}/privacy" style="color: #9ca3af;">Privacy</a> · <a href="${baseUrl}/terms" style="color: #9ca3af;">Terms</a>
    </p>
  </div>
</body>
</html>`
}
