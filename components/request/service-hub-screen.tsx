"use client"

/**
 * Service Hub Screen - Main entry point for /request
 *
 * Shows service selection cards when no service is pre-selected via URL.
 * Handles draft detection and resume/clear functionality.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePostHog } from "posthog-js/react"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { stagger } from "@/lib/motion"
import {
  FileText,
  Pill,
  Stethoscope,
  ChevronRight,
  RotateCcw,
  Trash2,
  Heart,
  Scissors,
  Scale,
  Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { getPreferences, savePreferences } from "@/lib/request/preferences"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import {
  getAllDrafts,
  clearDraft,
  type DraftData,
  type CanonicalServiceType,
} from "@/lib/request/draft-storage"

interface ServiceHubScreenProps {
  onSelectService: (service: UnifiedServiceType, consultSubtype?: string) => void
}

const SERVICE_NAMES: Record<UnifiedServiceType, string> = {
  "med-cert": "medical certificate",
  prescription: "repeat prescription",
  "repeat-script": "repeat prescription",
  consult: "consultation",
}

// Consult sub-services with call requirements and pricing
const CONSULT_SUBTYPES = [
  {
    id: "general",
    label: "General consultation",
    icon: Stethoscope,
    bullets: ["New medication", "General health concerns", "Referrals & specialist letters"],
    callBadge: "Sometimes requires a call",
    callVariant: "secondary" as const,
    price: PRICING_DISPLAY.CONSULT,
  },
  {
    id: "ed",
    label: "Men's intimate health",
    icon: Heart,
    bullets: ["Doctor-assessed treatment options", "Discreet, no phone call needed"],
    callBadge: "No call needed",
    callVariant: "success" as const,
    price: PRICING_DISPLAY.MENS_HEALTH,
  },
  {
    id: "hair_loss",
    label: "Hair loss treatment",
    icon: Scissors,
    bullets: ["Doctor-assessed treatment options", "Treatment plan assessment"],
    callBadge: "No call needed",
    callVariant: "success" as const,
    price: PRICING_DISPLAY.HAIR_LOSS,
  },
  {
    id: "womens_health",
    label: "Women's health",
    icon: Sparkles,
    bullets: ["Contraception", "UTI treatment", "Period & hormonal concerns"],
    callBadge: "No call needed",
    callVariant: "success" as const,
    price: PRICING_DISPLAY.WOMENS_HEALTH,
  },
  {
    id: "weight_loss",
    label: "Weight management",
    icon: Scale,
    bullets: ["Doctor-guided treatment assessment", "Includes brief phone consultation"],
    callBadge: "Quick call required",
    callVariant: "outline" as const,
    price: PRICING_DISPLAY.WEIGHT_LOSS,
  },
] as const

export function ServiceHubScreen({ onSelectService }: ServiceHubScreenProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const [drafts, setDrafts] = useState<DraftData[]>([])
  const [showConsultSubtypes, setShowConsultSubtypes] = useState(false)
  const [lastServiceType, setLastServiceType] = useState<string | null>(null)

  // Check for existing drafts and last service on mount
  useEffect(() => {
    const allDrafts = getAllDrafts()
    setDrafts(allDrafts)

    const prefs = getPreferences()
    if (prefs.lastServiceType) {
      setLastServiceType(prefs.lastServiceType)
      posthog?.capture("returning_user", {
        last_service: prefs.lastServiceType,
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
      savePreferences({ lastServiceType: service })
      onSelectService(service, consultSubtype)
    },
    [drafts.length, lastServiceType, onSelectService, posthog],
  )

  const handleConsultSubtype = useCallback(
    (subtype: string) => {
      posthog?.capture("consult_subtype_selected", { subtype })
      handleSelectService("consult", subtype)
    },
    [handleSelectService, posthog],
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-center">What do you need help with?</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Draft Banners */}
        <AnimatePresence>
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
                    {SERVICE_NAMES[draft.serviceType as UnifiedServiceType]} request.
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
                onClick={() => handleSelectService(lastServiceType as UnifiedServiceType)}
                className="w-full text-left mb-4"
              >
                <Card className="border-primary/30 bg-primary/5" pressable>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <RotateCcw className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Request again</p>
                          <p className="text-xs text-muted-foreground">
                            Start another{" "}
                            {SERVICE_NAMES[lastServiceType as UnifiedServiceType]}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Service Cards */}
        <motion.div
          className="space-y-3"
          variants={prefersReducedMotion ? undefined : stagger.container}
          initial={prefersReducedMotion ? undefined : "initial"}
          animate={prefersReducedMotion ? undefined : "animate"}
        >
          {/* Medical Certificate */}
          <ServiceCard
            icon={FileText}
            title="Medical certificate"
            description="📋 Usually ready in 30 minutes — no appointment needed"
            badge={{ text: "No call needed", variant: "success" }}
            timeHint="~3 min form"
            price={PRICING_DISPLAY.MED_CERT}
            pricePrefix="From"
            popular
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            iconColor="text-blue-600 dark:text-blue-400"
            onClick={() => handleSelectService("med-cert")}
            prefersReducedMotion={prefersReducedMotion}
            testId="service-card-med-cert"
          />

          {/* Repeat Prescription */}
          <ServiceCard
            icon={Pill}
            title="Repeat prescription"
            description="🔄 Refill your regular medication"
            badge={{ text: "No call needed", variant: "success" }}
            timeHint="~4 min form"
            price={PRICING_DISPLAY.REPEAT_SCRIPT}
            iconBg="bg-emerald-50 dark:bg-emerald-950/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            onClick={() => handleSelectService("repeat-script")}
            prefersReducedMotion={prefersReducedMotion}
            testId="service-card-prescription"
          />

          {/* Doctor Consultation */}
          <ServiceCard
            icon={Stethoscope}
            title="Doctor consultation"
            description="💬 Women's health, ED treatment, hair loss, and more"
            badge={{ text: "Usually requires a call", variant: "secondary" }}
            timeHint="~5 min form"
            price={PRICING_DISPLAY.CONSULT}
            pricePrefix="From"
            iconBg="bg-sky-50 dark:bg-sky-950/30"
            iconColor="text-sky-600 dark:text-sky-400"
            onClick={() => setShowConsultSubtypes(!showConsultSubtypes)}
            expanded={showConsultSubtypes}
            prefersReducedMotion={prefersReducedMotion}
            testId="service-card-consult"
          >
            {/* Consult Subtypes */}
            <AnimatePresence>
              {showConsultSubtypes && (
                <motion.div
                  initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 mt-4 border-t border-border/50 space-y-2">
                    {CONSULT_SUBTYPES.map((subtype) => (
                      <button
                        key={subtype.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConsultSubtype(subtype.id)
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl text-left",
                          "bg-muted/50 hover:bg-muted transition-colors",
                          "group/sub",
                        )}
                        data-testid={`consult-subtype-${subtype.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <subtype.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-medium block">{subtype.label}</span>
                            <ul className="mt-0.5 space-y-0">
                              {subtype.bullets.map((bullet) => (
                                <li
                                  key={bullet}
                                  className="text-xs text-muted-foreground leading-relaxed"
                                >
                                  • {bullet}
                                </li>
                              ))}
                            </ul>
                            <Badge
                              variant={subtype.callVariant}
                              className="text-xs mt-1 px-1.5 py-0"
                            >
                              {subtype.callBadge}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {subtype.price}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/sub:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ServiceCard>
        </motion.div>

        {/* Trust footer */}
        <p className="text-center text-sm text-muted-foreground pt-2">
          All requests are reviewed by Australian-registered doctors.
        </p>
      </main>
    </div>
  )
}

interface ServiceCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  badge: { text: string; variant: "success" | "secondary" | "default" }
  timeHint?: string
  price: string
  pricePrefix?: string
  popular?: boolean
  iconBg: string
  iconColor: string
  onClick: () => void
  expanded?: boolean
  children?: React.ReactNode
  prefersReducedMotion: boolean | null
  testId?: string
}

function ServiceCard({
  icon: Icon,
  title,
  description,
  badge,
  timeHint,
  price,
  pricePrefix,
  popular,
  iconBg,
  iconColor,
  onClick,
  expanded,
  children,
  prefersReducedMotion,
  testId,
}: ServiceCardProps) {
  return (
    <motion.div variants={prefersReducedMotion ? undefined : stagger.item}>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left group"
        data-testid={testId}
      >
        <Card
          className={cn(
            "relative overflow-hidden border border-border/50 dark:border-white/10",
            // Tier 2 elevation: two-layer shadow + inner top highlight
            "[box-shadow:0_2px_8px_rgba(37,99,235,0.06),0_1px_3px_rgba(37,99,235,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]",
            "dark:[box-shadow:none] dark:shadow-none",
            // Hover: card lifts and shadow deepens
            "group-hover:-translate-y-0.5",
            "group-hover:[box-shadow:0_8px_24px_rgba(37,99,235,0.10),0_2px_6px_rgba(37,99,235,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]",
            "dark:group-hover:border-white/20",
            "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          )}
          pressable
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Service icon — springs on group hover */}
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  iconBg,
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6",
                    iconColor,
                    "transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110",
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Title + popular badge inline */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-base leading-tight">{title}</h3>
                      {popular && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200/80 dark:border-amber-700/40 rounded-full px-2 py-0.5 leading-none whitespace-nowrap">
                          Most popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>

                  {/* Chevron + price */}
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <ChevronRight
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform duration-200",
                        expanded && "rotate-90",
                      )}
                    />
                    <div className="text-right">
                      {pricePrefix && (
                        <span className="text-xs text-muted-foreground">{pricePrefix} </span>
                      )}
                      <span className="text-sm font-semibold text-foreground">{price}</span>
                    </div>
                  </div>
                </div>

                {/* Call badge + time hint */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant={badge.variant} className="text-xs">
                    {badge.text}
                  </Badge>
                  {timeHint && (
                    <span className="text-xs text-muted-foreground">{timeHint}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable content (consult subtypes) */}
            {children}
          </CardContent>
        </Card>
      </button>
    </motion.div>
  )
}
