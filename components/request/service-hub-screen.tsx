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
  'med-cert': 'medical certificate',
  'prescription': 'repeat prescription',
  'repeat-script': 'repeat prescription',
  'consult': 'consultation',
}

// Consult sub-services with call requirements and pricing
const CONSULT_SUBTYPES = [
  {
    id: 'general',
    label: 'General consultation',
    icon: Stethoscope,
    bullets: ['New prescriptions', 'General health concerns', 'Referrals & specialist letters'],
    callBadge: 'Sometimes requires a call',
    callVariant: 'secondary' as const,
    price: PRICING_DISPLAY.CONSULT,
  },
  {
    id: 'ed',
    label: "Men's intimate health",
    icon: Heart,
    bullets: ['Doctor-assessed treatment options', 'Discreet, no phone call needed'],
    callBadge: 'No call needed',
    callVariant: 'success' as const,
    price: PRICING_DISPLAY.MENS_HEALTH,
  },
  {
    id: 'hair_loss',
    label: 'Hair loss treatment',
    icon: Scissors,
    bullets: ['Doctor-assessed treatment options', 'Treatment plan assessment'],
    callBadge: 'No call needed',
    callVariant: 'success' as const,
    price: PRICING_DISPLAY.MENS_HEALTH,
  },
  {
    id: 'womens_health',
    label: "Women's health",
    icon: Sparkles,
    bullets: ['Contraception', 'UTI treatment', 'Period & hormonal concerns'],
    callBadge: 'No call needed',
    callVariant: 'success' as const,
    price: '$59.95',
  },
  {
    id: 'weight_loss',
    label: 'Weight management',
    icon: Scale,
    bullets: ['Doctor-guided treatment assessment', 'Includes brief phone consultation'],
    callBadge: 'Quick call required',
    callVariant: 'outline' as const,
    price: '$79.95',
  },
] as const

export function ServiceHubScreen({ onSelectService }: ServiceHubScreenProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const [drafts, setDrafts] = useState<DraftData[]>([])
  const [showConsultSubtypes, setShowConsultSubtypes] = useState(false)
  const [lastServiceType, setLastServiceType] = useState<string | null>(null)

  // Check for existing drafts and last service on mount
  useEffect(() => {
    // Get all valid drafts from service-scoped storage
    const allDrafts = getAllDrafts()
    setDrafts(allDrafts)
    
    // Check for returning user's last service
    const prefs = getPreferences()
    if (prefs.lastServiceType) {
      setLastServiceType(prefs.lastServiceType)
    }
  }, [])

  // Handle draft resume for a specific service
  const handleResumeDraft = useCallback((draftToResume: DraftData) => {
    posthog?.capture('draft_resumed', {
      service_type: draftToResume.serviceType,
      step_id: draftToResume.currentStepId,
    })
    
    // Navigate to the service - store will restore the step
    router.push(`/request?service=${draftToResume.serviceType}`)
  }, [router, posthog])

  // Handle draft clear for a specific service
  const handleClearDraft = useCallback((serviceType: CanonicalServiceType) => {
    posthog?.capture('draft_cleared', {
      service_type: serviceType,
    })
    
    // Clear only this service's draft
    clearDraft(serviceType)
    
    // Update local state
    setDrafts(prev => prev.filter(d => d.serviceType !== serviceType))
  }, [posthog])

  // Handle service selection
  const handleSelectService = useCallback((service: UnifiedServiceType, consultSubtype?: string) => {
    posthog?.capture('service_selected', {
      service_type: service,
      consult_subtype: consultSubtype,
      had_drafts: drafts.length > 0,
      is_repeat: service === lastServiceType,
    })
    
    // Save last service type for "Request again" feature
    savePreferences({ lastServiceType: service })
    
    // Note: We do NOT clear drafts here - each service has its own draft
    // and selecting a different service should not destroy other drafts
    
    onSelectService(service, consultSubtype)
  }, [drafts.length, lastServiceType, onSelectService, posthog])

  // Handle consult subtype selection
  const handleConsultSubtype = useCallback((subtype: string) => {
    posthog?.capture('consult_subtype_selected', {
      subtype,
    })
    
    handleSelectService('consult', subtype)
  }, [handleSelectService, posthog])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-center">
            What do you need help with?
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Draft Banners - one per service with a valid draft */}
        <AnimatePresence>
          {drafts.map((draft) => (
            <motion.div
              key={draft.serviceType}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert className="border-primary/20 bg-primary/5 mb-3">
                <RotateCcw className="w-4 h-4" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-sm">
                    You have an unfinished {SERVICE_NAMES[draft.serviceType as UnifiedServiceType]} request.
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

        {/* Request Again - for returning users */}
        <AnimatePresence>
          {lastServiceType && drafts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
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
                            Start another {SERVICE_NAMES[lastServiceType as UnifiedServiceType]}
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
        <div className="space-y-4">
          {/* Medical Certificate */}
          <ServiceCard
            icon={FileText}
            title="Medical certificate"
            description="For work, uni, or caring for someone"
            badge={{ text: "No call needed", variant: "success" }}
            price="$19"
            pricePrefix="From"
            popularBadge
            onClick={() => handleSelectService('med-cert')}
            index={0}
            testId="service-card-med-cert"
          />

          {/* Repeat Prescription */}
          <ServiceCard
            icon={Pill}
            title="Repeat prescription"
            description="Refill your regular medication"
            badge={{ text: "No call needed", variant: "success" }}
            price={PRICING_DISPLAY.REPEAT_SCRIPT}
            pricePrefix=""
            onClick={() => handleSelectService('prescription')}
            index={1}
            testId="service-card-prescription"
          />

          {/* Doctor Consultation */}
          <ServiceCard
            icon={Stethoscope}
            title="Doctor consultation"
            description="New prescriptions, referrals, or health concerns"
            badge={{ text: "Usually requires a call", variant: "secondary" }}
            price={PRICING_DISPLAY.CONSULT}
            pricePrefix="From"
            onClick={() => setShowConsultSubtypes(!showConsultSubtypes)}
            expanded={showConsultSubtypes}
            index={2}
            testId="service-card-consult"
          >
            {/* Consult Subtypes */}
            <AnimatePresence>
              {showConsultSubtypes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
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
                          "group"
                        )}
                        data-testid={`consult-subtype-${subtype.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <subtype.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-medium block">{subtype.label}</span>
                            <ul className="mt-0.5 space-y-0">
                              {subtype.bullets.map((bullet) => (
                                <li key={bullet} className="text-xs text-muted-foreground leading-relaxed">
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
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ServiceCard>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground pt-4">
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
  price: string
  pricePrefix?: string
  popularBadge?: boolean
  onClick: () => void
  expanded?: boolean
  children?: React.ReactNode
  index: number
}

function ServiceCard({ 
  icon: Icon, 
  title, 
  description, 
  badge,
  price,
  pricePrefix = "From",
  popularBadge,
  onClick, 
  expanded,
  children,
  index,
  testId,
}: ServiceCardProps & { testId?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <button 
        type="button"
        onClick={onClick}
        className="w-full text-left"
        data-testid={testId}
      >
        <Card 
          className="cursor-pointer relative overflow-hidden" 
          pressable
        >
          {/* Popular badge */}
          {popularBadge && (
            <div className="absolute top-0 right-0">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                Most popular
              </div>
            </div>
          )}
          
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <ChevronRight 
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform",
                        expanded && "rotate-90"
                      )} 
                    />
                    {/* Price */}
                    <div className="text-right mt-1">
                      <span className="text-xs text-muted-foreground">{pricePrefix}</span>
                      <span className="text-sm font-semibold text-foreground ml-1">{price}</span>
                    </div>
                  </div>
                </div>
                
                {/* Badge */}
                <div className="mt-2">
                  <Badge variant={badge.variant} className="text-xs">
                    {badge.text}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Children (for expandable content) */}
            {children}
          </CardContent>
        </Card>
      </button>
    </motion.div>
  )
}
