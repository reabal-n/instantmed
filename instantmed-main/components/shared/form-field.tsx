"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle2, Eye, EyeOff, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FormFieldProps {
  label: string
  name: string
  type?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  error?: string
  success?: boolean
  helperText?: string
  tooltip?: string
  required?: boolean
  disabled?: boolean
  className?: string
  inputClassName?: string
  multiline?: boolean
  rows?: number
  maxLength?: number
  showCharCount?: boolean
  autoComplete?: string
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  success,
  helperText,
  tooltip,
  required,
  disabled,
  className,
  inputClassName,
  multiline,
  rows = 4,
  maxLength,
  showCharCount,
  autoComplete,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)

  const inputType = type === "password" && showPassword ? "text" : type

  const handleFocus = () => setIsFocused(true)
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const charCount = value?.length || 0

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={name}
          className={cn(
            "text-sm font-medium transition-colors duration-200",
            isFocused && "text-primary",
            error && "text-destructive",
            success && "text-green-600"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="relative">
        {multiline ? (
          <Textarea
            id={name}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={cn(
              "transition-all duration-200 resize-none",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
              error && "border-destructive focus:ring-destructive/20 focus:border-destructive",
              success && "border-green-500 focus:ring-green-500/20 focus:border-green-500",
              inputClassName
            )}
          />
        ) : (
          <div className="relative">
            <Input
              id={name}
              name={name}
              type={inputType}
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={disabled}
              maxLength={maxLength}
              autoComplete={autoComplete}
              className={cn(
                "transition-all duration-200 pr-10",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                error && "border-destructive focus:ring-destructive/20 focus:border-destructive",
                success && "border-green-500 focus:ring-green-500/20 focus:border-green-500",
                type === "password" && "pr-16",
                inputClassName
              )}
            />

            {/* Status icons */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {type === "password" && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
              {error && <AlertCircle className="h-4 w-4 text-destructive animate-shake" />}
              {success && !error && <CheckCircle2 className="h-4 w-4 text-green-500 animate-scale-in" />}
            </div>
          </div>
        )}

        {/* Animated focus line */}
        <div
          className={cn(
            "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#00E2B5] to-[#06B6D4] transition-all duration-300",
            isFocused ? "w-full" : "w-0"
          )}
        />
      </div>

      {/* Helper text / Error / Character count */}
      <div className="flex items-center justify-between min-h-[20px]">
        <div className="flex-1">
          {error && (
            <p className="text-xs text-destructive animate-fade-in-up flex items-center gap-1">
              {error}
            </p>
          )}
          {!error && helperText && (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          )}
        </div>
        {showCharCount && maxLength && (
          <span
            className={cn(
              "text-xs transition-colors",
              charCount > maxLength * 0.9 ? "text-amber-500" : "text-muted-foreground",
              charCount >= maxLength && "text-destructive"
            )}
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}

// Form section component for grouping fields
interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// Form card wrapper
interface FormCardProps {
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function FormCard({ title, description, children, footer, className }: FormCardProps) {
  return (
    <div className={cn("glass-card rounded-2xl overflow-hidden", className)}>
      {(title || description) && (
        <div className="px-6 py-5 border-b border-border/50">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-4 bg-muted/30 border-t border-border/50">{footer}</div>}
    </div>
  )
}

// Add shake animation to globals.css reference
// @keyframes shake already exists in the CSS
