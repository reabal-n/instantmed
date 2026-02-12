/**
 * Weight Loss Consultation Approved Email Template
 *
 * Sent to patient when their weight loss consultation is approved.
 * Includes GLP-1 medication instructions (semaglutide/liraglutide).
 */

import * as React from "react"
import {
  BaseEmail,
  Text,
  Button,
  Box,
  Heading,
  List,
  SuccessBanner,
  colors,
} from "../base-email"

export interface WeightLossApprovedEmailProps {
  patientName: string
  medicationName: string
  requestId: string
  appUrl?: string
}

function isGLP1(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower.includes("semaglutide") ||
    lower.includes("ozempic") ||
    lower.includes("wegovy") ||
    lower.includes("liraglutide") ||
    lower.includes("saxenda")
  )
}

export function WeightLossApprovedEmail({
  patientName,
  medicationName,
  requestId,
  appUrl = "https://instantmed.com.au",
}: WeightLossApprovedEmailProps) {
  const glp1 = isGLP1(medicationName)

  return (
    <BaseEmail
      previewText={`Your ${medicationName} prescription has been approved`}
      appUrl={appUrl}
    >
      <SuccessBanner title="Treatment approved" />

      <Text>Hi {patientName},</Text>

      <Text>
        Your doctor has reviewed your consultation and approved your prescription for{" "}
        <strong>{medicationName}</strong>. Your eScript token will arrive via SMS shortly.
      </Text>

      <Box variant="info">
        <Heading as="h3">eScript arriving via SMS</Heading>
        <Text small>
          Take your phone to any pharmacy. The pharmacist will scan your eScript QR code
          to dispense your medication. Note: this medication may need to be special-ordered
          by the pharmacy.
        </Text>
      </Box>

      {glp1 && (
        <>
          <Box>
            <Heading as="h3">How to administer your injection</Heading>
            <List
              items={[
                "Inject subcutaneously (under the skin) in your abdomen, thigh, or upper arm",
                "Rotate injection sites each time — don't inject in the same spot twice in a row",
                "Inject once weekly on the same day each week (for semaglutide) or daily (for liraglutide)",
                "Store your pen in the fridge (2–8°C) before first use. After first use, it can be kept at room temperature for up to 28 days",
                "Your doctor will start you on a low dose and gradually increase it over several weeks",
              ]}
            />
          </Box>

          <Box>
            <Heading as="h3">What to expect</Heading>
            <List
              items={[
                "Nausea is common in the first 2–4 weeks — this usually improves as your body adjusts",
                "Eat smaller, more frequent meals to help manage nausea",
                "Stay well hydrated — aim for at least 2 litres of water per day",
                "You may notice reduced appetite — this is the medication working as intended",
                "Weight loss typically becomes noticeable after 4–8 weeks of treatment",
              ]}
            />
          </Box>

          <Box variant="warning">
            <Heading as="h3">When to contact your doctor</Heading>
            <List
              items={[
                "Severe or persistent nausea, vomiting, or diarrhoea",
                "Severe abdominal pain (may indicate pancreatitis — seek urgent care)",
                "Signs of allergic reaction: rash, swelling, difficulty breathing",
                "Injection site reactions that don't resolve (redness, swelling, pain)",
                "Symptoms of low blood sugar if you also take diabetes medication",
              ]}
            />
          </Box>
        </>
      )}

      {!glp1 && (
        <Box>
          <Heading as="h3">Taking your medication</Heading>
          <List
            items={[
              "Follow the instructions provided by your doctor and pharmacist",
              "Take your medication as prescribed",
              "Note any side effects and discuss them at your follow-up",
              "Combine with a balanced diet and regular physical activity for best results",
            ]}
          />
        </Box>
      )}

      <Box>
        <Heading as="h3">Lifestyle tips for success</Heading>
        <List
          items={[
            "Combine medication with a balanced, calorie-appropriate diet",
            "Aim for at least 150 minutes of moderate physical activity per week",
            "Keep a food and weight diary to track your progress",
            "Your doctor may schedule follow-up check-ins to monitor your progress and adjust dosing",
          ]}
        />
      </Box>

      <div style={{ textAlign: "center" }}>
        <Button href={`${appUrl}/patient/intakes/${requestId}`}>
          View Request Details
        </Button>
      </div>

      <Text muted small>
        Questions about your treatment? Reply to this email or visit our{" "}
        <a href={`${appUrl}/contact`} style={{ color: colors.primary, fontWeight: 500 }}>
          help center
        </a>
        .
      </Text>
    </BaseEmail>
  )
}

export const weightLossApprovedSubject = (medicationName: string) =>
  `Your ${medicationName} prescription has been approved`
