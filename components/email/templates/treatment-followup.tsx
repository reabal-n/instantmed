import * as React from "react"
import {
  BaseEmail,
  HeroBlock,
  Text,
  Button,
  colors,
} from "../base-email"

export type FollowupSubtype = "ed" | "hair_loss"
export type FollowupMilestone = "month_3" | "month_6" | "month_12"

export interface TreatmentFollowupEmailProps {
  patientName: string
  followupId: string
  subtype: FollowupSubtype
  milestone: FollowupMilestone
  appUrl?: string
}

const MILESTONE_LABEL: Record<FollowupMilestone, string> = {
  month_3: "3-month",
  month_6: "6-month",
  month_12: "12-month",
}

const SUBTYPE_FRAMING: Record<FollowupSubtype, Record<FollowupMilestone, string>> = {
  ed: {
    month_3:
      "You started your treatment about three months ago. By now most men are starting to see how it's working for them. We'd like to check in — just a few quick questions.",
    month_6:
      "You're six months into your treatment. This is a good time to take stock: is it working well? Are there any side effects? Your doctor wants to know.",
    month_12:
      "It's been a year since you started treatment. Your doctor would like a brief update on how it's been going for you, and whether anything's changed.",
  },
  hair_loss: {
    month_3:
      "You've been using your hair-loss treatment for about three months now. Early changes are usually subtle — sometimes it's less shedding before any visible regrowth. We'd love a quick update.",
    month_6:
      "You're six months into your hair-loss treatment. Most people see meaningful changes by now. Your doctor would like to check in on how it's going.",
    month_12:
      "It's been twelve months — the point where the full effect of hair-loss treatment is usually visible. Your doctor would like to hear how you're doing.",
  },
}

export function treatmentFollowupSubject(
  subtype: FollowupSubtype,
  milestone: FollowupMilestone,
): string {
  const label = MILESTONE_LABEL[milestone]
  const service = subtype === "ed" ? "your treatment" : "your hair-loss treatment"
  return `How's ${service} going? — InstantMed ${label} check-in`
}

export function TreatmentFollowupEmail({
  patientName,
  followupId,
  subtype,
  milestone,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
}: TreatmentFollowupEmailProps) {
  const label = MILESTONE_LABEL[milestone]
  const framing = SUBTYPE_FRAMING[subtype][milestone]
  const ctaHref = `${appUrl}/patient/followups/${followupId}`
  const skipHref = `${appUrl}/patient/followups/${followupId}/skip`

  return (
    <BaseEmail
      previewText={`Your ${label} treatment check-in is ready`}
      appUrl={appUrl}
      showFooterReview={false}
    >
      <HeroBlock
        icon="📋"
        headline={`Your ${label} check-in`}
        subtitle="Takes about a minute"
        variant="info"
      />

      <Text>Hi {patientName},</Text>

      <Text>{framing}</Text>

      <Text>
        This takes about a minute. Your responses go straight to your doctor.
      </Text>

      <Button href={ctaHref}>Share your {label} update</Button>

      <Text muted small style={{ textAlign: "center" as const, marginTop: "24px" }}>
        Not relevant anymore?{" "}
        <a href={skipHref} style={{ color: colors.textSecondary, textDecoration: "underline" }}>
          Skip this check-in
        </a>{" "}
        and we won&apos;t send more reminders for this milestone.
      </Text>
    </BaseEmail>
  )
}
