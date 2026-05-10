"use client"

/**
 * Service Hub Screen - Premium entry point for /request
 *
 * 5 active service cards (outcome-framed):
 *   Medical certificate · Repeat prescription · ED treatment · Hair loss · General consult
 * 2 coming-soon cards (muted, 2-col grid):
 *   Women's health · Weight management
 */

import { ChevronRight, RotateCcw, Star, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { RequestButton } from "@/components/request/request-button"
import { requestCx } from "@/components/request/request-cx"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { getConsultDraftResumeHref } from "@/lib/request/consult-flow"
import {
  type CanonicalServiceType,
  clearDraft,
  type DraftData,
  getAllDrafts,
} from "@/lib/request/draft-storage"
import { getPreferences, savePreferences } from "@/lib/request/preferences"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import {
  getActiveServices,
  getComingSoonServices,
  type ServiceDef as CanonicalServiceDef,
} from "@/lib/services/service-catalog"
import { getPatientCount } from "@/lib/social-proof"

// ─── Service definitions ──────────────────────────────────────────────────
//
// Sourced from the canonical catalog (lib/services/service-catalog.ts).
// Do not inline definitions here — update the catalog instead.
//
// Local alias that adds the click handler shape expected by CompactServiceRow.
type ServiceDef = CanonicalServiceDef

const SERVICES: ServiceDef[] = getActiveServices()
const COMING_SOON: ServiceDef[] = getComingSoonServices()

const SERVICE_NAMES: Record<string, string> = {
  "med-cert": "medical certificate",
  prescription: "repeat prescription",
  "repeat-script": "repeat prescription",
  consult: "consultation",
}

const CONSULT_SUBTYPE_NAMES: Record<string, string> = {
  ed: "ED consultation",
  hair_loss: "hair loss consultation",
  womens_health: "women's health consultation",
  weight_loss: "weight management consultation",
}

// ─── Component ────────────────────────────────────────────────────────────

interface ServiceHubScreenProps {
  onSelectService: (service: UnifiedServiceType, consultSubtype?: string) => void
}

export function ServiceHubScreen({ onSelectService }: ServiceHubScreenProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const [drafts, setDrafts] = useState<DraftData[]>([])
  const [lastServiceType, setLastServiceType] = useState<string | null>(null)
  const [lastConsultSubtype, setLastConsultSubtype] = useState<string | null>(null)

  useEffect(() => {
    const allDrafts = getAllDrafts()
    setDrafts(allDrafts)
    const prefs = getPreferences()
    if (prefs.lastServiceType) {
      setLastServiceType(prefs.lastServiceType)
      setLastConsultSubtype(prefs.lastConsultSubtype ?? null)
      posthog?.capture("returning_user", {
        last_service: prefs.lastServiceType,
        last_subtype: prefs.lastConsultSubtype,
        has_drafts: allDrafts.length > 0,
      })
    }
  }, [posthog])

  const handleResumeDraft = useCallback(
    (draftToResume: DraftData) => {
      const consultSubtype = draftToResume.answers.consultSubtype as string | undefined
      posthog?.capture("draft_resumed", {
        service_type: draftToResume.serviceType,
        step_id: draftToResume.currentStepId,
        consult_subtype: consultSubtype,
      })
      router.push(getConsultDraftResumeHref(draftToResume))
    },
    [router, posthog],
  )

  const handleClearDraft = useCallback(
    (serviceType: CanonicalServiceType) => {
      posthog?.capture("draft_cleared", { service_type: serviceType })
      clearDraft(serviceType)
      setDrafts((prev) => prev.filter((d) => d.serviceType !== serviceType))
    },
    [posthog],
  )

  const handleSelectService = useCallback(
    (service: UnifiedServiceType, consultSubtype?: string) => {
      posthog?.capture("service_selected", {
        service_type: service,
        consult_subtype: consultSubtype,
        had_drafts: drafts.length > 0,
        is_repeat: service === lastServiceType,
      })
      savePreferences({ lastServiceType: service, lastConsultSubtype: consultSubtype })
      onSelectService(service, consultSubtype)
    },
    [drafts.length, lastServiceType, onSelectService, posthog],
  )

  const patientCount = getPatientCount()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-xl mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold text-center text-foreground sm:text-xl">
            What brings you in today?
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-4 space-y-4 sm:py-6 sm:space-y-6">
        {/* Social proof strip */}
        <div className="flex flex-nowrap items-center justify-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2.5 sm:text-xs">
          <span className="whitespace-nowrap font-medium text-foreground">
            {patientCount.toLocaleString()}+ Australians
          </span>
          <span className="text-border-em">·</span>
          <span className="whitespace-nowrap">AHPRA doctors</span>
          <span className="text-border-em">·</span>
          <div className="flex items-center gap-0.5 whitespace-nowrap" aria-label="Google star rating">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className="w-2.5 h-2.5 fill-amber-400 text-amber-400"
              />
            ))}
          </div>
        </div>

        {/* Draft banners - compact inline bars */}
        {drafts.map((draft) => (
          <div key={draft.serviceType}>
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 mb-2">
              <span className="text-sm text-foreground truncate">
                Continue your{" "}
                {SERVICE_NAMES[draft.serviceType as string] ?? "request"}?
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleClearDraft(draft.serviceType)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Discard draft"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <RequestButton
                  size="sm"
                  onClick={() => handleResumeDraft(draft)}
                  className="h-7 px-3 text-xs gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Resume
                </RequestButton>
              </div>
            </div>
          </div>
        ))}

        {/* Request Again - compact row for returning users */}
        {lastServiceType && drafts.length === 0 && (
          <div>
            <button
              type="button"
              onClick={() =>
                handleSelectService(
                  lastServiceType as UnifiedServiceType,
                  lastServiceType === "consult" ? (lastConsultSubtype ?? undefined) : undefined,
                )
              }
              className="w-full text-left group mb-2"
            >
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 group-hover:bg-primary/8 transition-colors duration-150">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    Request another{" "}
                    {lastServiceType === "consult" && lastConsultSubtype
                      ? (CONSULT_SUBTYPE_NAMES[lastConsultSubtype] ?? SERVICE_NAMES[lastServiceType] ?? "request")
                      : (SERVICE_NAMES[lastServiceType] ?? "request")}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        )}

        {/* ── Active service cards ────────────────────────────────────── */}
        <div
          className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] overflow-hidden divide-y divide-border/40"
        >
          {SERVICES.map((svc) => (
            <CompactServiceRow
              key={svc.id}
              {...svc}
              onClick={() => handleSelectService(svc.serviceRoute, svc.subtype)}
            />
          ))}
        </div>

        {/* ── Coming soon ────────────────────────────────────────────── */}
        <div
          data-coming-soon-strip="true"
          className="rounded-2xl border border-border/40 bg-muted/20 px-3.5 py-2.5 dark:bg-white/[0.04]"
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Coming soon
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {COMING_SOON.map((svc) => (
              <span
                key={svc.id}
                aria-disabled="true"
                aria-label={`${svc.title}: not taking requests yet`}
                className="inline-flex min-w-0 items-baseline gap-1.5 text-xs text-muted-foreground"
              >
                <span className="font-medium text-foreground/65">
                  {svc.title}
                </span>
                <span className="text-muted-foreground/80">
                  Not taking requests yet
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Trust footer ───────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 pt-1 pb-2">
          <div
            data-request-hub-cert-footer="true"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-border/50 bg-white px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
          >
            <span>LegitScript certified</span>
            <span className="h-1 w-1 rounded-full bg-border-em" aria-hidden="true" />
            <span>Google healthcare certified</span>
          </div>
          <p className="text-center text-[11px] leading-snug text-muted-foreground">
            All requests are reviewed by Australian-registered doctors.
          </p>
          <p className="text-center text-[11px] leading-snug text-muted-foreground">
            No Medicare needed for medical certificates. Medicare details are required for prescriptions and consults.
          </p>
        </div>
      </main>
    </div>
  )
}

// ─── Compact Service Row ─────────────────────────────────────────────────

interface CompactRowProps extends ServiceDef {
  onClick: () => void
}

function CompactServiceRow({
  title,
  subtitle,
  price,
  pricePrefix,
  effort,
  iconKey,
  colorToken,
  popular,
  onClick,
}: CompactRowProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={requestCx(
          "w-full text-left group px-4 py-3.5",
          "hover:bg-muted/50 active:scale-[0.99] active:bg-muted/60 dark:hover:bg-white/[0.08]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "transition-[background-color,transform] duration-150",
        )}
      >
        <div className="flex items-center gap-3.5">
          {/* Service icon tile — canonical gradient-tile variant */}
          <ServiceIconTile iconKey={iconKey} color={colorToken} size="md" className="shrink-0" variant="sticker" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-semibold text-base leading-tight text-foreground">
                {title}
              </h3>
              {popular && (
                <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-700/40 rounded-full px-1.5 py-0.5 leading-none whitespace-nowrap">
                  Popular
                </span>
              )}
            </div>
            <p className="text-sm leading-snug text-muted-foreground mt-0.5">
              {subtitle}
              <span className="text-border-em mx-1.5">·</span>
              {effort}
            </p>
          </div>

          {/* Price + chevron */}
          <div className="flex w-[4.5rem] shrink-0 items-center justify-end gap-1.5 sm:w-20">
            <div className="min-w-0 text-right tabular-nums">
              {pricePrefix && (
                <span className="block text-[10px] leading-none text-muted-foreground">
                  {pricePrefix}{" "}
                </span>
              )}
              <span className="text-base font-semibold leading-none text-foreground">
                {price}
              </span>
            </div>
            <ChevronRight
              className={requestCx(
                "w-4 h-4 text-muted-foreground/40",
                "transition-[transform,color] duration-150",
                "group-hover:text-muted-foreground group-hover:translate-x-0.5",
              )}
            />
          </div>
        </div>
      </button>
    </div>
  )
}
