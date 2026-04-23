"use client"

/**
 * Shared FormField component for request flow steps
 * Includes HelpTooltip integration and consistent styling
 *
 * Accessibility: auto-injects `id`, `aria-describedby`, and `aria-invalid`
 * onto the first valid React-element child so the Label's `htmlFor` always
 * binds to the actual input. If the child is a component that doesn't accept
 * `id` on its root (e.g. Radix Select), pass `id` on FormField AND set the
 * matching id on the labelable inner element (e.g. SelectTrigger).
 */

import React, { useId } from "react"

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

  // Inject id + a11y props onto the first valid React element child.
  // Preserves any id the caller set explicitly.
  let injected = false
  const enhancedChildren = React.Children.map(children, (child) => {
    if (injected || !React.isValidElement(child)) return child
    injected = true
    const existing = child.props as {
      id?: string
      'aria-describedby'?: string
      'aria-invalid'?: boolean
    }
    const describedByParts = [
      existing['aria-describedby'],
      error ? errorId : undefined,
      hint && !error ? hintId : undefined,
    ].filter(Boolean)
    return React.cloneElement(child, {
      id: existing.id || fieldId,
      'aria-describedby': describedByParts.length ? describedByParts.join(' ') : undefined,
      'aria-invalid': error ? true : existing['aria-invalid'],
    } as Partial<typeof existing>)
  })

  return (
    <div
      className={`space-y-1 ${className || ''}`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
          {required && <span className="sr-only"> (required)</span>}
        </Label>
        {helpContent && (
          <HelpTooltip title={helpContent.title} content={helpContent.content} />
        )}
      </div>
      {hint && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
      {enhancedChildren}
      {error && <p id={errorId} className="text-xs text-destructive mt-1" role="alert" aria-live="polite">{error}</p>}
    </div>
  )
}
