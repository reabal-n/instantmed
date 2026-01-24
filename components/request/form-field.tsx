"use client"

/**
 * Shared FormField component for request flow steps
 * Includes HelpTooltip integration and consistent styling
 */

import { Label } from "@/components/ui/label"
import { HelpTooltip } from "./help-tooltip"

export interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  hint?: string
  helpContent?: { title?: string; content: string }
  icon?: React.ElementType
  className?: string
}

export function FormField({
  label,
  required,
  error,
  children,
  hint,
  helpContent,
  icon: Icon,
  className,
}: FormFieldProps) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {helpContent && (
          <HelpTooltip title={helpContent.title} content={helpContent.content} />
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
