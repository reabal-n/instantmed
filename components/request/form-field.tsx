"use client"

/**
 * Shared FormField component for request flow steps
 * Includes HelpTooltip integration and consistent styling
 */

import { useId } from "react"
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
  /** Optional ID for aria-describedby linking. Auto-generated if not provided. */
  id?: string
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
  id: providedId,
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = providedId || generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  return (
    <div 
      className={`space-y-1 ${className || ''}`}
      role="group"
      aria-describedby={error ? errorId : hint ? hintId : undefined}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {helpContent && (
          <HelpTooltip title={helpContent.title} content={helpContent.content} />
        )}
      </div>
      {hint && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p id={errorId} className="text-xs text-destructive mt-1" role="alert">{error}</p>}
    </div>
  )
}
