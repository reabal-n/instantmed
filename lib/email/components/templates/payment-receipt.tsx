/**
 * Payment Receipt Email Template
 *
 * Sent to patient after successful payment.
 * Confirms the transaction and provides a reference.
 */

import * as React from "react"

import { ABN,COMPANY_NAME } from "@/lib/constants"

import {
  BaseEmail,
  Button,
  colors,
  Divider,
  fontFamily,
  HeroBlock,
  Text,
} from "../base-email"

export interface PaymentReceiptEmailProps {
  patientName: string
  serviceName: string
  amount: string
  intakeRef: string
  paidAt: string
  dashboardUrl: string
  appUrl?: string
}

export function PaymentReceiptEmail({
  patientName,
  serviceName,
  amount,
  intakeRef,
  paidAt,
  dashboardUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: PaymentReceiptEmailProps) {
  const firstName = patientName.split(" ")[0]
  const gst = (parseFloat(amount.replace(/[^0-9.]/g, "")) / 11).toFixed(2)

  return (
    <BaseEmail
      previewText={`Payment confirmed for your ${serviceName}. A doctor is on it now.`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="✓"
        headline="You&apos;re all set!"
        subtitle={`${serviceName} · ${amount}`}
        variant="success"
      />

      <Text style={{ fontFamily }}>Hey {firstName},</Text>

      <Text style={{ fontFamily }}>
        Your <strong>{serviceName}</strong> is with a doctor now. We&apos;ll send it over the moment it&apos;s done after doctor approval.
      </Text>

      <Button href={dashboardUrl}>Track your request</Button>

      <Divider />

      {/* Tax receipt */}
      <div
        style={{
          backgroundColor: "#F5F7F9",
          border: `1px solid ${colors.border}`,
          borderRadius: "10px",
          padding: "16px 20px",
        }}
      >
        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "10px",
            fontWeight: "700",
            color: colors.textSecondary,
            textTransform: "uppercase" as const,
            letterSpacing: "1px",
            fontFamily,
          }}
        >
          TAX RECEIPT · {COMPANY_NAME} · ABN {ABN}
        </p>
        <table role="presentation" cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ padding: "12px 0", color: colors.textSecondary, fontSize: "14px", borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                Service
              </td>
              <td style={{ padding: "12px 0", fontSize: "14px", fontWeight: 600, textAlign: "right" as const, color: colors.text, borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                {serviceName}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", color: colors.textSecondary, fontSize: "14px", borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                Amount paid
              </td>
              <td style={{ padding: "12px 0", fontSize: "14px", fontWeight: 600, textAlign: "right" as const, color: colors.text, borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                {amount}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", color: colors.textSecondary, fontSize: "14px", borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                GST included
              </td>
              <td style={{ padding: "12px 0", fontSize: "14px", fontWeight: 400, textAlign: "right" as const, color: colors.text, borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                ${gst}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", color: colors.textSecondary, fontSize: "14px", borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                Date
              </td>
              <td style={{ padding: "12px 0", fontSize: "14px", fontWeight: 400, textAlign: "right" as const, color: colors.text, borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                {paidAt}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", color: colors.textSecondary, fontSize: "14px", borderBottom: `1px solid ${colors.borderLight}`, fontFamily }}>
                Reference
              </td>
              <td style={{ padding: "12px 0", fontSize: "13px", fontWeight: 400, fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace", textAlign: "right" as const, color: colors.text, borderBottom: `1px solid ${colors.borderLight}`, letterSpacing: "0.5px" }}>
                {intakeRef}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseEmail>
  )
}

export function paymentReceiptEmailSubject(serviceName: string, firstName?: string) {
  if (firstName) {
    return `${firstName}, payment received for your ${serviceName} ✅`
  }
  return `Payment received for your ${serviceName} ✅`
}
