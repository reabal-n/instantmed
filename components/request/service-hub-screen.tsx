"use client"

/**
 * Service Hub Screen — Premium entry point for /request
 *
 * 4 active hero cards (outcome-framed):
 *   Medical certificate · Repeat prescription · ED treatment · Hair loss
 * 2 coming-soon cards (muted, 2-col grid):
 *   Women's health · Weight management
 *
 * General consult phased out — specialty services are top-level.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePostHog } from "@/components/providers/posthog-provider"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { stagger } from "@/lib/motion"
import { ChevronRight, RotateCcw, Trash2, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ServiceIconTile } from "@/components/icons/service-icons"
import { WaitlistCapture } from "@/components/request/waitlist-capture"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { cn } from "@/lib/utils"
import { getPatientCount } from "@/lib/social-proof"
import { getPreferences, savePreferences } from "@/lib/request/preferences"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import {
  getAllDrafts,
  clearDraft,
  type DraftData,
  type CanonicalServiceType,
} from "@/lib/request/draft-storage"

// ─── Service definitions ──────────────────────────────────────────────────

interface ServiceDef {
  id: string
  title: string
  subtitle: string
  price: string
  pricePrefix?: string
  badge: { text: string; variant: "success" | "secondary" | "outline" }
  effort: string
  iconKey: string
  iconColor: string
  popular?: boolean
  service: UnifiedServiceType
  subtype?: string
}

const SERVICES: ServiceDef[] = [
  {
    id: "med-cert",
    title: "Get a medical certificate",
    subtitle: "Doctor-reviewed and ready in ~30 minutes",
    price: PRICING_DISPLAY.MED_CERT,
    pricePrefix: "From",
    badge: { text: "No call needed", variant: "success" },
    effort: "~2 min",
    iconKey: "FileText",
    iconColor: "cyan",
    popular: true,
    service: "med-cert",
    subtype: undefined,
  },
  {
    id: "repeat-rx",
    title: "Refill your medication",
    subtitle: "Renew an existing prescription online",
    price: PRICING_DISPLAY.REPEAT_SCRIPT,
    badge: { text: "No call needed", variant: "success" },
    effort: "~3 min",
    iconKey: "Pill",
    iconColor: "emerald",
    service: "repeat-script",
    subtype: undefined,
  },
  {
    id: "ed",
    title: "Treat erectile dysfunction",
    subtitle: "Discreet doctor assessment — no phone call",
    price: PRICING_DISPLAY.MENS_HEALTH,
    badge: { text: "No call needed", variant: "success" },
    effort: "~4 min",
    iconKey: "Lightning",
    iconColor: "blue",
    service: "consult",
    subtype: "ed",
  },
  {
    id: "hair-loss",
    title: "Treat hair loss",
    subtitle: "Doctor-assessed treatment plan",
    price: PRICING_DISPLAY.HAIR_LOSS,
    badge: { text: "No call needed", variant: "success" },
    effort: "~2 min",
    iconKey: "Sparkles",
    iconColor: "violet",
    service: "consult",
    subtype: "hair_loss",
  },
]

const COMING_SOON = [
  {
    id: "womens-health",
    title: "Women's health",
    subtitle: "Contraception, UTI treatment & more",
    iconKey: "Heart",
    iconColor: "pink",
  },
  {
    id: "weight-loss",
    title: "Weight management",
    subtitle: "Doctor-guided treatment plan",
    iconKey: "Flame",
    iconColor: "rose",
  },
]

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

  const handleClearAllDrafts = useCallback(() => {
    posthog?.capture("all_drafts_cleared", { count: drafts.length })
    drafts.forEach((d) => clearDraft(d.serviceType))
    setDrafts([])
  }, [drafts, posthog])

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

        {/* Draft banners */}
        <AnimatePresence>
          {drafts.length > 1 && (
            <motion.div
              key="clear-all"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-end mb-1"
            >
              <button
                type="button"
                onClick={handleClearAllDrafts}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear all drafts
              </button>
            </motion.div>
          )}
          {drafts.map((draft) => (
            <motion.div
              key={draft.serviceType}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert className="border-primary/20 bg-primary/5 mb-3">
                <RotateCcw className="w-4 h-4" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-sm">
                    You have an unfinished{" "}
                    {SERVICE_NAMES[draft.serviceType as string] ?? "request"}.
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClearDraft(draft.serviceType)}
                      className="gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Start fresh
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResumeDraft(draft)}
                      className="gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Resume
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Request Again — returning users */}
        <AnimatePresence>
          {lastServiceType && drafts.length === 0 && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
                <div
                  className={cn(
                    "rounded-xl bg-primary/5 border border-primary/20 p-3.5",
                    "group-hover:bg-primary/8 transition-colors duration-200",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <RotateCcw className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Request again</p>
                        <p className="text-xs text-muted-foreground">
                          Start another{" "}
                          {lastServiceType === 'consult' && lastConsultSubtype
                            ? (CONSULT_SUBTYPE_NAMES[lastConsultSubtype] ?? SERVICE_NAMES[lastServiceType] ?? "request")
                            : (SERVICE_NAMES[lastServiceType] ?? "request")}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active service cards ────────────────────────────────────── */}
        <motion.div
          className="space-y-3"
          variants={prefersReducedMotion ? undefined : stagger.container}
          initial={prefersReducedMotion ? undefined : "initial"}
          animate={prefersReducedMotion ? undefined : "animate"}
        >
          {SERVICES.map((svc) => (
            <HeroServiceCard
              key={svc.id}
              {...svc}
              onClick={() => handleSelectService(svc.service, svc.subtype)}
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
                className="rounded-xl bg-muted/30 border border-border/30 p-4"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <ServiceIconTile
                    iconKey={svc.iconKey}
                    color={svc.iconColor}
                    size="sm"
                    className="opacity-50"
                  />
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {svc.title}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  {svc.subtitle}
                </p>
                <WaitlistCapture serviceId={svc.id} serviceName={svc.title} />
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

// ─── Hero Service Card ────────────────────────────────────────────────────

interface HeroCardProps extends ServiceDef {
  onClick: () => void
  prefersReducedMotion: boolean | null
}

function HeroServiceCard({
  title,
  subtitle,
  price,
  pricePrefix,
  badge,
  effort,
  iconKey,
  iconColor,
  popular,
  onClick,
  prefersReducedMotion,
}: HeroCardProps) {
  return (
    <motion.div variants={prefersReducedMotion ? undefined : stagger.item}>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left group"
      >
        <div
          className={cn(
            "relative rounded-2xl bg-white dark:bg-card p-5",
            "border border-border/50 dark:border-white/10",
            // Solid depth — two-layer shadow + inner highlight
            "[box-shadow:0_2px_8px_rgba(37,99,235,0.06),0_1px_3px_rgba(37,99,235,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]",
            "dark:[box-shadow:none]",
            // Hover: lift + deepen shadow
            "group-hover:-translate-y-0.5",
            "group-hover:[box-shadow:0_8px_24px_rgba(37,99,235,0.10),0_2px_6px_rgba(37,99,235,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]",
            "dark:group-hover:border-white/20",
            "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          )}
        >
          {/* Top section: icon + title/subtitle */}
          <div className="flex items-start gap-4">
            <ServiceIconTile
              iconKey={iconKey}
              color={iconColor}
              size="lg"
              className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-[15px] leading-snug text-foreground">
                  {title}
                </h3>
                {popular && (
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-700/40 rounded-full px-2 py-0.5 leading-none whitespace-nowrap">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {subtitle}
              </p>
            </div>

            <ChevronRight
              className={cn(
                "w-5 h-5 text-muted-foreground/50 shrink-0 mt-1",
                "transition-all duration-200",
                "group-hover:text-muted-foreground group-hover:translate-x-0.5",
              )}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border/40 dark:border-white/5 mt-4 mb-3" />

          {/* Bottom section: metadata row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Badge variant={badge.variant} className="text-[11px] px-2 py-0">
                {badge.text}
              </Badge>
              <span className="text-xs text-muted-foreground">{effort}</span>
            </div>
            <div className="text-right">
              {pricePrefix && (
                <span className="text-[11px] text-muted-foreground">
                  {pricePrefix}{" "}
                </span>
              )}
              <span className="text-sm font-semibold text-foreground">
                {price}
              </span>
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  )
}
