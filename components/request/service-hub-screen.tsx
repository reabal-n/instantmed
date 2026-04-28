"use client"

/**
 * Service Hub Screen - Premium entry point for /request
 *
 * 5 active service cards (outcome-framed):
 *   Medical certificate · Repeat prescription · ED treatment · Hair loss · General consult
 * 2 coming-soon cards (muted, 2-col grid):
 *   Women's health · Weight management
 */

import { AnimatePresence,motion } from "framer-motion"
import { ChevronRight, MessageSquare,RotateCcw, Star, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback,useEffect, useState } from "react"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { stagger } from "@/lib/motion"
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
import { cn } from "@/lib/utils"

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
  const prefersReducedMotion = useReducedMotion()
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
      posthog?.capture("draft_resumed", {
        service_type: draftToResume.serviceType,
        step_id: draftToResume.currentStepId,
      })
      router.push(`/request?service=${draftToResume.serviceType}`)
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
        <div className="max-w-xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-center text-foreground">
            What brings you in today?
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Social proof strip */}
        <div className="flex items-center justify-center gap-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {patientCount.toLocaleString()}+ Australians
          </span>
          <span className="text-border-em">·</span>
          <span>AHPRA doctors</span>
          <span className="text-border-em">·</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className="w-2.5 h-2.5 fill-amber-400 text-amber-400"
              />
            ))}
            <span className="text-xs font-medium text-foreground ml-0.5">
              4.8
            </span>
          </div>
        </div>

        {/* Draft banners - compact inline bars */}
        <AnimatePresence>
          {drafts.map((draft) => (
            <motion.div
              key={draft.serviceType}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
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
                  <Button
                    size="sm"
                    onClick={() => handleResumeDraft(draft)}
                    className="h-7 px-3 text-xs gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resume
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Request Again - compact row for returning users */}
        <AnimatePresence>
          {lastServiceType && drafts.length === 0 && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <button
                type="button"
                onClick={() =>
                  handleSelectService(
                    lastServiceType as UnifiedServiceType,
                    lastServiceType === 'consult' ? (lastConsultSubtype ?? undefined) : undefined,
                  )
                }
                className="w-full text-left group mb-2"
              >
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 group-hover:bg-primary/8 transition-colors duration-150">
                  <div className="flex items-center gap-2.5">
                    <RotateCcw className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      Request another{" "}
                      {lastServiceType === 'consult' && lastConsultSubtype
                        ? (CONSULT_SUBTYPE_NAMES[lastConsultSubtype] ?? SERVICE_NAMES[lastServiceType] ?? "request")
                        : (SERVICE_NAMES[lastServiceType] ?? "request")}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust signal badges */}
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Form-first
          </span>
          <span className="text-border-em">·</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <MessageSquare className="w-3 h-3 text-muted-foreground/70" />
            Doctor reviewed
            <span className="inline-block w-[1px] h-3 bg-muted-foreground/40 animate-pulse" />
          </span>
        </div>

        {/* ── Active service cards ────────────────────────────────────── */}
        <motion.div
          className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] overflow-hidden divide-y divide-border/40"
          variants={prefersReducedMotion ? undefined : stagger.container}
          initial={prefersReducedMotion ? undefined : "initial"}
          animate={prefersReducedMotion ? undefined : "animate"}
        >
          {SERVICES.map((svc) => (
            <CompactServiceRow
              key={svc.id}
              {...svc}
              onClick={() => handleSelectService(svc.serviceRoute, svc.subtype)}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </motion.div>

        {/* ── Coming soon ────────────────────────────────────────────── */}
        <div className="pt-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Coming soon
          </p>
          <div className="grid grid-cols-2 gap-3">
            {COMING_SOON.map((svc) => (
              <div
                key={svc.id}
                className="rounded-xl bg-muted/30 border border-border/30 px-4 py-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <ServiceIconTile
                    iconKey={svc.iconKey}
                    color={svc.colorToken}
                    size="sm"
                    className="opacity-60 grayscale"
                  />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {svc.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {svc.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust footer ───────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <LegitScriptSeal size="sm" />
            <GoogleAdsCert size="sm" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            All requests are reviewed by Australian-registered doctors.
          </p>
        </div>
      </main>
    </div>
  )
}

// ─── Compact Service Row ─────────────────────────────────────────────────

interface CompactRowProps extends ServiceDef {
  onClick: () => void
  prefersReducedMotion: boolean | null
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
  prefersReducedMotion,
}: CompactRowProps) {
  return (
    <motion.div variants={prefersReducedMotion ? undefined : stagger.item}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left group px-4 py-3.5",
          "hover:bg-muted/50 dark:hover:bg-white/[0.08]",
          "transition-colors duration-150",
        )}
      >
        <div className="flex items-center gap-3.5">
          {/* Service icon tile — canonical gradient-tile variant */}
          <ServiceIconTile iconKey={iconKey} color={colorToken} size="md" className="shrink-0" variant="sticker" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {title}
              </h3>
              {popular && (
                <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-700/40 rounded-full px-1.5 py-0.5 leading-none whitespace-nowrap">
                  Popular
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {subtitle}
              <span className="text-border-em mx-1.5">·</span>
              {effort}
            </p>
          </div>

          {/* Price + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              {pricePrefix && (
                <span className="text-[10px] text-muted-foreground">
                  {pricePrefix}{" "}
                </span>
              )}
              <span className="text-sm font-semibold text-foreground">
                {price}
              </span>
            </div>
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground/40",
                "transition-[transform,color] duration-150",
                "group-hover:text-muted-foreground group-hover:translate-x-0.5",
              )}
            />
          </div>
        </div>
      </button>
    </motion.div>
  )
}
