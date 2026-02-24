/**
 * Repeat Prescription Reminder Email Template
 *
 * Sent to patients when their repeat prescription is due for renewal.
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
  Box,
  Heading,
  colors,
} from "../base-email"

export interface RepeatRxReminderEmailProps {
  patientName: string
  medicationName: string
  reorderUrl?: string
  appUrl?: string
}

export function RepeatRxReminderEmail({
  patientName,
  medicationName,
  reorderUrl,
  appUrl = "https://instantmed.com.au",
}: RepeatRxReminderEmailProps) {
  const orderUrl = reorderUrl || `${appUrl}/request?type=repeat-script`

  return (
    <BaseEmail
      previewText={`Time to renew your ${medicationName} prescription`}
      appUrl={appUrl}
    >
      <div
        style={{
          backgroundColor: colors.infoBg,
          border: `1px solid ${colors.infoBorder}`,
          borderRadius: "8px",
          padding: "20px 24px",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: colors.text,
            fontSize: "20px",
            margin: 0,
            fontWeight: 600,
          }}
        >
          Time to renew your prescription
        </h1>
        <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: colors.textMuted }}>
          Your {medicationName} refill may be due
        </p>
      </div>

      <Text>Hi {patientName},</Text>

      <Text>
        It&apos;s been about 30 days since your last <strong>{medicationName}</strong> prescription.
        If you&apos;re running low, you can quickly request a repeat through InstantMed.
      </Text>

      <Box>
        <Heading as="h3">How it works</Heading>
        <ul style={{ paddingLeft: "20px", margin: "8px 0", color: colors.text }}>
          <li style={{ marginBottom: "6px", fontSize: "14px" }}>Click the button below to start your repeat request</li>
          <li style={{ marginBottom: "6px", fontSize: "14px" }}>Your details are pre-filled from last time</li>
          <li style={{ marginBottom: "6px", fontSize: "14px" }}>A doctor reviews and sends your eScript within hours</li>
        </ul>
      </Box>

      <div style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={orderUrl}>
          Renew my prescription
        </Button>
      </div>

      <Text muted small>
        If you no longer need this medication or have questions, just reply to this email
        or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help center
        </a>
        . You can also unsubscribe from these reminders in your{" "}
        <a href={`${appUrl}/patient/settings`} style={{ color: colors.accent, fontWeight: 500 }}>
          account settings
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const repeatRxReminderSubject = (medicationName: string) =>
  `Reminder: Time to renew your ${medicationName} prescription`
