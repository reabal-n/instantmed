"use client"

import { HelpCircle } from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface HelpTooltipProps {
  content: string
  className?: string
  placement?: "top" | "right" | "bottom" | "left"
}

export function HelpTooltip({ 
  content, 
  className,
  placement = "top"
}: HelpTooltipProps) {
  return (
    <Tooltip
      content={content}
      placement={placement}
      delay={200}
      closeDelay={0}
      className="max-w-xs p-3 text-sm bg-popover text-popover-foreground border border-border shadow-lg rounded-lg"
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center",
          "w-4 h-4 rounded-full",
          "text-muted-foreground hover:text-foreground",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          className
        )}
        aria-label="Help information"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </Tooltip>
  )
}

// Field label with inline help
interface FieldLabelWithHelpProps {
  label: string
  helpText: string
  required?: boolean
  className?: string
}

export function FieldLabelWithHelp({
  label,
  helpText,
  required = false,
  className,
}: FieldLabelWithHelpProps) {
  return (
    <div className={cn("flex items-center gap-2 mb-2", className)}>
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <HelpTooltip content={helpText} />
    </div>
  )
}

// Predefined help text for common fields
export const commonHelpText = {
  medicare: "Your Individual Reference Number (IRN) is the single digit number at the end of your Medicare card, next to your name.",
  irn: "This is the number next to your name on your Medicare card (1-5).",
  dob: "Enter your date of birth as it appears on your Medicare card.",
  phone: "We'll use this to contact you if needed. Australian numbers only.",
  email: "We'll send your certificate and updates to this email address.",
  symptoms: "Please describe your symptoms in detail. This helps the doctor assess your condition.",
  medications: "List all medications you're currently taking, including over-the-counter drugs.",
  allergies: "List any known allergies or adverse reactions to medications.",
  duration: "How many days off work or study do you need?",
  employer: "Enter your employer's name as it should appear on the certificate.",
}
