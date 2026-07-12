import {
  HEARD_ABOUT_US_OPTIONS,
  isHeardAboutUsValue,
} from "@/lib/analytics/heard-about-us"
import {
  type AttributionClassificationInput,
  type AttributionSourceGroup,
  classifyAttributionSource,
} from "@/lib/analytics/source-classification"

/**
 * Compact acquisition-source summary for operator case rows (ledger, queue).
 *
 * Wraps the shared 10-group classifier with two row-specific behaviours:
 *  - SHORT labels sized for a dense row cell ("Search" not "Organic non-brand").
 *  - The self-reported "How did you hear about us?" answer fills the gap when
 *    code-side attribution reads Direct/Unknown — that survey exists precisely
 *    because ~half of paid orders arrive referrer-stripped (LLM apps, iOS,
 *    word-of-mouth), so a dark row with a self-report shows "Self: ChatGPT or
 *    other AI" instead of a shrugging "Direct".
 *
 * Staff-only acquisition metadata (never PHI, never patient-facing).
 */
export type CaseRowAttribution = {
  group: AttributionSourceGroup
  /** Short row label, e.g. "Google Ads", "Search", "AI", "Self: Saw an ad". */
  label: string
  /** Tooltip detail: keyword, landing path, or the full self-report answer. */
  title: string
  /** True when the label came from the patient's self-report, not code capture. */
  selfReported: boolean
}

const SHORT_GROUP_LABELS: Record<AttributionSourceGroup, string> = {
  google_ads: "Google Ads",
  other_paid: "Paid",
  organic_brand: "Search",
  organic_nonbrand: "Search",
  ai_referral: "AI",
  recovery_email: "Email",
  lifecycle_email: "Email",
  referral: "Referral",
  direct: "Direct",
  unknown: "Unknown",
}

function heardAboutUsLabel(value: string): string | null {
  if (!isHeardAboutUsValue(value)) return null
  return HEARD_ABOUT_US_OPTIONS.find((option) => option.value === value)?.label ?? null
}

export function buildCaseRowAttribution(
  row: AttributionClassificationInput & { heard_about_us?: string | null },
): CaseRowAttribution {
  const classification = classifyAttributionSource(row)
  const selfReport = row.heard_about_us ? heardAboutUsLabel(row.heard_about_us) : null

  // Dark traffic + a self-report → the survey answer is the best signal we have.
  if ((classification.group === "direct" || classification.group === "unknown") && selfReport) {
    return {
      group: classification.group,
      label: `Self: ${selfReport}`,
      title: `Self-reported: ${selfReport} (no code-side attribution captured)`,
      selfReported: true,
    }
  }

  const detailParts = [
    row.keyword?.trim() || null,
    classification.source !== classification.label.toLowerCase() &&
    classification.source !== classification.group
      ? classification.source
      : null,
  ].filter(Boolean)
  const detail = detailParts[0]

  return {
    group: classification.group,
    label: SHORT_GROUP_LABELS[classification.group] ?? classification.label,
    title: detail
      ? `${classification.label} — ${detail}`
      : classification.label,
    selfReported: false,
  }
}
