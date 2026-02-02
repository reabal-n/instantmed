/**
 * Payment Receipt Email Template
 *
 * Sent to patient after successful payment.
 * Confirms the transaction and provides a reference.
 */

import * as React from "react"
import {
  BaseEmail,
  SuccessBanner,
  Text,
  Button,
  Box,
  Heading,
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
  appUrl = "https://instantmed.com.au",
}: PaymentReceiptEmailProps) {
  return (
    <BaseEmail
      previewText={`Payment confirmed — ${amount} for ${serviceName}`}
      appUrl={appUrl}
    >
      <SuccessBanner title="Payment confirmed" />

      <Text>Hi {patientName},</Text>

      <Text>
        We&apos;ve received your payment of <strong>{amount}</strong> for{" "}
        <strong>{serviceName}</strong>. A doctor will review your request shortly.
      </Text>

      <Box>
        <Heading as="h3">Receipt Details</Heading>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", color: "#6b7280" }}>Service</td>
              <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>
                {serviceName}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#6b7280" }}>Amount</td>
              <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>
                {amount}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#6b7280" }}>Reference</td>
              <td
                style={{
                  padding: "8px 0",
                  textAlign: "right",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              >
                {intakeRef}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#6b7280" }}>Date</td>
              <td style={{ padding: "8px 0", textAlign: "right" }}>{paidAt}</td>
            </tr>
          </tbody>
        </table>
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={dashboardUrl}>Track Your Request</Button>
      </div>

      <Text muted small>
        This receipt is for your records. You can view your request status on your{" "}
        <a href={dashboardUrl} style={{ color: "#00C9A7", fontWeight: 500 }}>
          dashboard
        </a>
        . Questions? Reply to this email.
      </Text>
    </BaseEmail>
  )
}

export const paymentReceiptEmailSubject = "Payment confirmed — {{service_name}}"
