/**
 * Request Declined Email Template
 *
 * Sent to patient when their request cannot be approved.
 * Tone: empathetic, reassuring, action-oriented. NOT clinical or alarming.
 *
 * Empathy wrapping (2026-05-26):
 * - Empathetic preamble before the doctor's verbatim note.
 * - Category-aware next-step paragraph after the note (driven by reasonCode).
 * - Soft, name-led sign-off.
 *
 * The component accepts both the legacy prop names (patientName / requestType /
 * appUrl) and the newer normalized props (patientFirstName / serviceLabel /
 * portalUrl) so existing callers keep working while new callers can pass cleaner
 * inputs. reasonCode is optional; unknown / missing codes fall back to a generic
 * "contact support" next-step.
 */

import * as React from "react"

import {
  APP_URL,
  BaseEmail,
  Box,
  Button,
  colors,
  fontFamily,
  Heading,
  HeroBlock,
  NameFirstGreeting,
  Text,
} from "../base-email"

/**
 * Normalized decline-reason codes used for next-step copy.
 *
 * Both the actual DeclineReasonCode enum values (`requires_examination`,
 * `insufficient_info`) and a small set of task-spec aliases
 * (`requires_in_person`, `insufficient_information`) resolve to the same
 * next-step paragraph. Anything else falls through to the "other" copy.
 */
export type DeclineEmailReasonCode =
  | "requires_in_person"
  | "requires_examination"
  | "outside_scope"
  | "insufficient_information"
  | "insufficient_info"
  | "not_telehealth_suitable"
  | "prescribing_guidelines"
  | "controlled_substance"
  | "urgent_care_needed"
  | "patient_not_eligible"
  | "duplicate_request"
  | "other"

export interface RequestDeclinedEmailProps {
  /** Legacy: full patient name. Either this or patientFirstName must be provided. */
  patientName?: string | null
  /** New: just the first name. Wins over patientName if both are set. */
  patientFirstName?: string | null
  /** Legacy: raw category / request type passed in by the action layer. */
  requestType?: string
  /** New: humanized service noun (e.g. "medical certificate"). Wins if both set. */
  serviceLabel?: string
  /** Intake id, used for the deep link to the request detail in the portal. */
  requestId?: string
  /** Doctor's note. Rendered verbatim in the highlighted block. */
  reason?: string
  /** Structured decline-reason code. Drives the next-step paragraph. */
  reasonCode?: DeclineEmailReasonCode | string
  /** Legacy: base app URL. */
  appUrl?: string
  /** New: explicit portal URL override. Falls back to appUrl. */
  portalUrl?: string
}

/** Cheap humaniser for the legacy category strings ("medical_certificate" -> "medical certificate"). */
function humanizeRequestType(raw: string | undefined): string {
  if (!raw) return "request"
  return raw.replace(/[_-]+/g, " ").toLowerCase().trim()
}

/** First-name extractor that tolerates null / empty / whitespace inputs. */
function resolveFirstName(
  patientFirstName: string | null | undefined,
  patientName: string | null | undefined,
): string {
  const candidate = (patientFirstName ?? "").trim() || (patientName ?? "").trim()
  if (!candidate) return "there"
  const first = candidate.split(/\s+/)[0]
  return first || "there"
}

interface NextStepCopy {
  body: React.ReactNode
}

/** Maps reasonCode to category-aware next-step copy. */
function getNextStepCopy(reasonCode: string | undefined): NextStepCopy {
  switch (reasonCode) {
    case "requires_in_person":
    case "requires_examination":
    case "not_telehealth_suitable":
      return {
        body: (
          <>
            We recommend booking an in-person appointment with your GP for a
            hands-on assessment. If you don&apos;t have a regular GP, the
            Healthdirect helpline (1800 022 222) can suggest options near you.
          </>
        ),
      }
    case "outside_scope":
    case "prescribing_guidelines":
    case "controlled_substance":
    case "patient_not_eligible":
      return {
        body: (
          <>
            This kind of request sits outside what InstantMed is set up to
            handle safely online. Your regular GP or a local clinic can help.
          </>
        ),
      }
    case "insufficient_information":
    case "insufficient_info":
      return {
        body: (
          <>
            If you&apos;d like to try again with more detail, you can submit a
            fresh request at any time.
          </>
        ),
      }
    case "urgent_care_needed":
      return {
        body: (
          <>
            Based on what you described, please seek in-person care promptly. If
            this is an emergency, call 000 or go to your nearest emergency
            department.
          </>
        ),
      }
    case "duplicate_request":
      return {
        body: (
          <>
            We found another recent request that matches this one, so we
            haven&apos;t processed this submission. If you think that&apos;s a
            mistake, reply to this email or contact{" "}
            <a
              href="mailto:support@instantmed.com.au"
              style={{ color: colors.accent, textDecoration: "underline" }}
            >
              support@instantmed.com.au
            </a>
            .
          </>
        ),
      }
    case "other":
    default:
      return {
        body: (
          <>
            If you have questions about this outcome, reply to this email or
            reach our support team at{" "}
            <a
              href="mailto:support@instantmed.com.au"
              style={{ color: colors.accent, textDecoration: "underline" }}
            >
              support@instantmed.com.au
            </a>
            .
          </>
        ),
      }
  }
}

export function RequestDeclinedEmail({
  patientName,
  patientFirstName,
  requestType,
  serviceLabel,
  requestId,
  reason,
  reasonCode,
  appUrl = APP_URL,
  portalUrl,
}: RequestDeclinedEmailProps) {
  const firstName = resolveFirstName(patientFirstName, patientName)
  const displayService = (serviceLabel || humanizeRequestType(requestType)).trim() || "request"
  const baseUrl = portalUrl || appUrl
  const trackUrl = requestId ? `${appUrl}/track/${requestId}` : `${baseUrl}`
  const nextStep = getNextStepCopy(reasonCode)

  return (
    <BaseEmail
      previewText={`Update on your ${displayService} request. Next steps inside.`}
      appUrl={appUrl}
    >
      <HeroBlock
        icon="📋"
        headline="We weren&apos;t able to help this time"
        variant="neutral"
      />

      <NameFirstGreeting name={firstName} />

      {/*
       * The preamble and sign-off use dangerouslySetInnerHTML so apostrophes
       * render as literal `'` instead of being escaped to `&#x27;`. Email clients
       * happily render either, but keeping the literal form makes the copy
       * easier to grep, test, and visually proofread.
       */}
      <p
        style={{
          margin: "0 0 12px 0",
          fontSize: "15px",
          color: colors.textBody,
          lineHeight: "1.6",
        }}
        dangerouslySetInnerHTML={{
          __html:
            "Thank you for getting in touch with InstantMed. We've reviewed your " +
            "request carefully, and we're unable to issue a " +
            `<strong>${escapeHtml(displayService)}</strong> this time. ` +
            "We know this isn't the answer you were hoping for, so we want to " +
            "be clear about what we found and what to do next.",
        }}
      />

      {reason && (
        <Box variant="info">
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "14px",
              color: colors.infoText,
              fontWeight: "600",
              fontFamily,
            }}
          >
            Doctor&apos;s note
          </p>
          <Text style={{ margin: 0 }}>{reason}</Text>
        </Box>
      )}

      <div style={{ margin: "20px 0" }}>
        <Heading as="h3">What to do next</Heading>
        <Text style={{ margin: 0 }}>{nextStep.body}</Text>
      </div>

      <Box variant="success">
        <Heading as="h3">Full refund guaranteed</Heading>
        <Text small style={{ margin: 0 }}>
          Your payment will be refunded in full to your original payment method
          within 5&ndash;7 business days. No action needed on your end.
        </Text>
      </Box>

      <p
        style={{
          margin: "20px 0 12px 0",
          fontSize: "15px",
          color: colors.textBody,
          lineHeight: "1.6",
        }}
        dangerouslySetInnerHTML={{
          __html:
            "We're sorry we couldn't help today. " +
            `Look after yourself, ${escapeHtml(firstName)}.`,
        }}
      />

      <Button href={trackUrl} variant="secondary">
        View request details
      </Button>
    </BaseEmail>
  )
}

/** Escape HTML special chars in interpolated values. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export const requestDeclinedEmailSubject = (requestType: string) =>
  `Update on your ${requestType} request`
