"use client"

/**
 * Help Tooltip Component
 * 
 * Provides contextual help for sensitive fields with:
 * - "Why do we need this?" explanations
 * - Medical jargon explainers
 * - Privacy reassurance
 */

import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface HelpTooltipProps {
  title?: string
  content: string
  /** Use popover on mobile for better UX */
  mobilePopover?: boolean
  className?: string
}

export function HelpTooltip({ 
  title, 
  content, 
  mobilePopover = true,
  className = "" 
}: HelpTooltipProps) {
  const trigger = (
    <button 
      type="button" 
      className={`text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full ${className}`}
      aria-label="Help"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  )

  const tooltipContent = (
    <div className="max-w-xs">
      {title && <p className="font-medium text-sm mb-1">{title}</p>}
      <p className="text-sm text-muted-foreground">{content}</p>
    </div>
  )

  // Use Popover on mobile (touch devices), Tooltip on desktop
  if (mobilePopover) {
    return (
      <>
        {/* Desktop: Tooltip */}
        <div className="hidden sm:inline-block">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{trigger}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Mobile: Popover (click-based) */}
        <div className="inline-block sm:hidden">
          <Popover>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent side="top" className="max-w-xs">
              {tooltipContent}
            </PopoverContent>
          </Popover>
        </div>
      </>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Pre-defined help content for common fields
export const FIELD_HELP = {
  email: {
    title: "Why do we need your email?",
    content: "We'll send your certificate or confirmation here. Your email is kept private and never shared.",
  },
  phone: {
    title: "Why do we need your phone?",
    content: "For prescriptions, we send your eScript via SMS. For other services, we only contact you if there's an urgent issue.",
  },
  dob: {
    title: "Why do we need your date of birth?",
    content: "Required for your medical record. Our services are only available to patients aged 18 and over.",
  },
  address: {
    title: "Why do we need your address?",
    content: "Some certificates may require your address. This is also used for Medicare claims if applicable.",
  },
  allergies: {
    title: "Why do we need allergy information?",
    content: "This helps our doctors prescribe safe medications and avoid potential reactions.",
  },
  conditions: {
    title: "Why do we need your medical history?",
    content: "Knowing your existing conditions helps our doctors provide safe, appropriate care.",
  },
  medications: {
    title: "Why do we need your current medications?",
    content: "This helps prevent dangerous drug interactions and ensures safe prescribing.",
  },
  medicare: {
    title: "Why do we ask about Medicare?",
    content: "With Medicare details, we can process bulk-billed services where available and submit claims on your behalf.",
  },
  symptoms: {
    title: "Why such detail about symptoms?",
    content: "The more detail you provide, the more accurately our doctors can assess your needs without requiring a call.",
  },
} as const

// Medical jargon explainer
export const MEDICAL_TERMS = {
  eScript: "An electronic prescription sent to your phone. Take it to any pharmacy to get your medication.",
  bulkBilled: "Medicare covers the cost - you pay nothing out of pocket.",
  telehealth: "A consultation done remotely via video, phone, or messaging instead of in-person.",
  PBS: "Pharmaceutical Benefits Scheme - government subsidies that reduce medication costs.",
  S4: "Schedule 4 - prescription-only medications that require a doctor's approval.",
  S8: "Schedule 8 - controlled medications with stricter prescribing rules.",
  AHPRA: "Australian Health Practitioner Regulation Agency - the body that registers all our doctors.",
} as const

export function MedicalTermTooltip({ 
  term, 
  children 
}: { 
  term: keyof typeof MEDICAL_TERMS
  children: React.ReactNode 
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted decoration-muted-foreground/50 cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{MEDICAL_TERMS[term]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
