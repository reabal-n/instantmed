"use client"

/**
 * Shared FormField component for request flow steps
 * Includes HelpTooltip integration and consistent styling
 *
 * Accessibility: auto-injects field semantics onto the child whose explicit
 * `id` matches the Label's `htmlFor`, falling back to the first valid element.
 * If the child is a component that doesn't accept `id` on its root (e.g.
 * Radix Select), pass `id` on FormField AND set the matching id on the
 * labelable inner element (e.g. SelectTrigger).
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
  let firstChildId: string | undefined
  React.Children.forEach(children, (child) => {
    if (firstChildId || !React.isValidElement(child)) return
    const props = child.props as { id?: unknown }
    if (typeof props.id === "string" && props.id.length > 0) {
      firstChildId = props.id
    }
  })

  const fieldId = providedId || firstChildId || generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  const hasExplicitControl = React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false
    const props = child.props as { id?: unknown }
    return props.id === fieldId
  })

  // Prefer the explicitly identified control when a field contains leading
  // helpers (for example, dose-frequency chips before a textarea). Otherwise
  // preserve the historical first-valid-child fallback.
  let injected = false
  const enhancedChildren = React.Children.map(children, (child) => {
    if (injected || !React.isValidElement(child)) return child
    const existing = child.props as {
      id?: string
      'aria-describedby'?: string
      'aria-invalid'?: boolean
      'aria-required'?: boolean
    }
    if (hasExplicitControl && existing.id !== fieldId) return child

    injected = true
    const describedByParts = Array.from(new Set([
      ...(existing['aria-describedby']?.split(/\s+/) ?? []),
      ...(hint ? [hintId] : []),
      ...(error ? [errorId] : []),
    ].filter(Boolean)))
    return React.cloneElement(child, {
      id: existing.id || fieldId,
      'aria-describedby': describedByParts.length ? describedByParts.join(' ') : undefined,
      'aria-invalid': error ? true : existing['aria-invalid'],
      'aria-required': required ? true : existing['aria-required'],
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
