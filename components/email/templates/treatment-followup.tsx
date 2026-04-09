import * as React from "react"

export type FollowupSubtype = "ed" | "hair_loss"
export type FollowupMilestone = "month_3" | "month_6" | "month_12"

export interface TreatmentFollowupEmailProps {
  patientName: string
  followupId: string
  subtype: FollowupSubtype
  milestone: FollowupMilestone
  baseUrl: string
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
  baseUrl,
}: TreatmentFollowupEmailProps) {
  const label = MILESTONE_LABEL[milestone]
  const framing = SUBTYPE_FRAMING[subtype][milestone]
  const ctaHref = `${baseUrl}/patient/followups/${followupId}`
  const skipHref = `${baseUrl}/patient/followups/${followupId}/skip`

  return (
    <html>
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1a1a", maxWidth: 560, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>Hi {patientName},</h1>

        <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
          {framing}
        </p>

        <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          This takes about a minute. Your responses go straight to your doctor.
        </p>

        <div style={{ textAlign: "center", margin: "32px 0" }}>
          <a
            href={ctaHref}
            style={{
              display: "inline-block",
              padding: "14px 28px",
              backgroundColor: "#0ea5e9",
              color: "#ffffff",
              textDecoration: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Share your {label} update
          </a>
        </div>

        <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, marginTop: 32, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
          Not relevant anymore? <a href={skipHref} style={{ color: "#64748b" }}>Skip this check-in</a> and we won&apos;t send more reminders for this milestone.
        </p>

        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16 }}>
          InstantMed Pty Ltd · Level 1/457–459 Elizabeth Street, Surry Hills NSW 2010 · support@instantmed.com.au
        </p>
      </body>
    </html>
  )
}
