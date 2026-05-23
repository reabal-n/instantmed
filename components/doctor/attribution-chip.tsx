import {
  type AttributionClassificationInput,
  type AttributionSourceGroup,
  classifyAttributionSource,
} from "@/lib/analytics/source-classification"
import { cn } from "@/lib/utils"

/**
 * AttributionChip: calm-chrome acquisition source display for staff.
 *
 * Surfaces "where did this request/patient come from?" using the shared
 * 9-group classifier at `lib/analytics/source-classification.ts`. Two
 * variants:
 *   - "inline"  one-line "Source: Google Ads / medical-certificate" for
 *               the intake detail header strip.
 *   - "block"   two-line block (label + landing path / source) for the
 *               patient profile identity strip when rendering first-touch
 *               and last-touch attribution side-by-side.
 *
 * Calm chrome: 8px semantic dot + plain text only. No colored backgrounds,
 * no badge pills. Staff-only data; never render on patient surfaces.
 */
export type AttributionChipVariant = "inline" | "block"

export interface AttributionChipProps {
  attribution: AttributionClassificationInput
  landingPage?: string | null
  className?: string
  variant?: AttributionChipVariant
  /** Optional override label rendered before the source, e.g. "First touch". */
  contextLabel?: string
}

// Semantic dot colours per acquisition group. Aligns with the StatusDot
// palette: blue for system primary, emerald for healthy organic, sky for
// AI referrals (purple/violet banned per DESIGN.md §1; sky maps to the
// brand morning palette and reads as the tech/cloud category), amber for
// paid (worth noticing), slate for inert/unknown. Brand coral is reserved
// and intentionally NOT used here.
const GROUP_DOT: Record<AttributionSourceGroup, string> = {
  google_ads: "bg-amber-500",
  other_paid: "bg-amber-500",
  organic_brand: "bg-emerald-500",
  organic_nonbrand: "bg-emerald-500",
  ai_referral: "bg-sky-500",
  recovery_email: "bg-blue-500",
  referral: "bg-blue-500",
  direct: "bg-slate-400",
  unknown: "bg-slate-400",
}

const MAX_LANDING_PATH = 40

function truncatePath(value: string, limit = MAX_LANDING_PATH): string {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1))}…`
}

function resolveLandingPath(
  attribution: AttributionClassificationInput,
  override?: string | null,
): string {
  const raw = (override ?? attribution.landing_page ?? "").trim()
  if (!raw) return ""

  try {
    const url = raw.startsWith("http")
      ? new URL(raw)
      : new URL(raw, "https://instantmed.com.au")
    return `${url.pathname}${url.search ? url.search : ""}`
  } catch {
    return raw
  }
}

export function AttributionChip({
  attribution,
  landingPage,
  className,
  variant = "inline",
  contextLabel,
}: AttributionChipProps) {
  const classification = classifyAttributionSource(attribution)
  const dotColor = GROUP_DOT[classification.group] ?? GROUP_DOT.unknown
  const landingPath = resolveLandingPath(attribution, landingPage)
  // Prefer the landing path. Fall back to the classifier's source token only
  // when it adds information beyond the group label (e.g. the host that
  // referred a "referral" group). Suppress the fallback when it would
  // restate the label or repeat the group key.
  const sourceFallback = classification.source.toLowerCase()
  const labelLower = classification.label.toLowerCase()
  const groupLower = classification.group.toLowerCase()
  const fallbackIsRedundant =
    !classification.source ||
    sourceFallback === labelLower ||
    sourceFallback === groupLower
  const detail = landingPath || (fallbackIsRedundant ? "" : classification.source)
  const detailDisplay = detail ? truncatePath(detail) : ""
  const ariaLabel = detailDisplay
    ? `Acquisition source: ${classification.label} via ${detail}`
    : `Acquisition source: ${classification.label}`

  if (variant === "block") {
    return (
      <span
        className={cn("inline-flex flex-col gap-0.5 align-top", className)}
        data-attribution-group={classification.group}
        aria-label={ariaLabel}
      >
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
              dotColor,
            )}
          />
          {contextLabel ? (
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {contextLabel}
            </span>
          ) : null}
          <span className="text-sm font-medium text-foreground">
            {classification.label}
          </span>
        </span>
        {detailDisplay ? (
          <span className="pl-4 text-xs text-muted-foreground" title={detail}>
            {detailDisplay}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
      data-attribution-group={classification.group}
      aria-label={ariaLabel}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
          dotColor,
        )}
      />
      <span className="text-foreground/80">
        {contextLabel ? `${contextLabel}: ` : "Source: "}
        <span className="font-medium text-foreground">{classification.label}</span>
      </span>
      {detailDisplay ? (
        <>
          <span aria-hidden="true" className="text-muted-foreground/60">
            ·
          </span>
          <span className="truncate" title={detail}>
            {detailDisplay}
          </span>
        </>
      ) : null}
    </span>
  )
}
