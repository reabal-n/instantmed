/**
 * Referral Credit Email Template
 *
 * Sent when a referred friend completes their first request,
 * crediting both the referrer and the referee.
 */

import * as React from "react"
import {
  BaseEmail,
  SuccessBanner,
  Text,
  Button,
  Box,
  DetailRow,
  colors,
} from "../base-email"

export interface ReferralCreditEmailProps {
  patientName: string
  creditAmount: string
  friendName?: string
  appUrl?: string
}

export function referralCreditSubject(creditAmount: string) {
  return `You've earned a ${creditAmount} credit!`
}

export function ReferralCreditEmail({
  patientName,
  creditAmount,
  friendName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: ReferralCreditEmailProps) {
  const firstName = patientName.split(" ")[0]
  const friendFirstName = friendName?.split(" ")[0]

  return (
    <BaseEmail
      previewText={`Nice one — you've earned a ${creditAmount} credit 👍`}
      appUrl={appUrl}
    >
      <SuccessBanner title="Referral credit earned" />

      <Text>Hi {firstName},</Text>

      <Text>
        {friendFirstName ? (
          <>
            Your friend <strong>{friendFirstName}</strong> just completed their first request on
            InstantMed. As a thank you, we&apos;ve added a <strong>{creditAmount}</strong> credit
            to your account.
          </>
        ) : (
          <>
            Someone you referred just completed their first request on InstantMed. As a thank you,
            we&apos;ve added a <strong>{creditAmount}</strong> credit to your account.
          </>
        )}
      </Text>

      <Box>
        <DetailRow label="Credit amount" value={creditAmount} />
        <DetailRow label="Applied to" value="Your next request" />
      </Box>

      <Button href={`${appUrl}/patient`}>View Your Credits</Button>

      <Text muted small>
        Credits are applied automatically at checkout. Share your referral link
        to keep earning — find it on your{" "}
        <a href={`${appUrl}/patient`} style={{ color: colors.accent, fontWeight: 500 }}>
          dashboard
        </a>
        .
      </Text>

      <Text muted small>
        Questions? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.accent, fontWeight: 500 }}>
          help centre
        </a>
        .
      </Text>
    </BaseEmail>
  )
}
