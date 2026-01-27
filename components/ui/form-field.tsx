"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface FormFieldProps {
  label?: string
  error?: string
  success?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * FormField wrapper with inline validation feedback
 * Replaces toast-only errors with visible inline messages
 */
export function FormField({
  label,
  error,
  success,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className={cn(
        "relative",
        error && "[&>input]:border-destructive [&>input]:focus-visible:ring-destructive",
        success && "[&>input]:border-green-500 [&>input]:focus-visible:ring-green-500"
      )}>
        {children}
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5 text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">{error}</span>
          </motion.div>
        )}
        
        {success && !error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5 text-green-600 dark:text-green-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">{success}</span>
          </motion.div>
        )}

        {hint && !error && !success && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </AnimatePresence>
    </div>
  )
}

interface FormErrorSummaryProps {
  errors: Record<string, string | undefined>
  className?: string
}

/**
 * Summary of all form errors at the top of a form
 */
export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  const errorList = Object.entries(errors).filter(([, v]) => v)
  
  if (errorList.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/5 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-destructive text-sm">
            Please fix the following errors:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-destructive/80">
            {errorList.map(([field, message]) => (
              <li key={field}>• {message}</li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Hook for managing form validation state
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validators: Partial<Record<keyof T, (value: unknown) => string | undefined>>
) {
  const [values, setValues] = React.useState(initialValues)
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({})

  const validateField = React.useCallback(
    (field: keyof T, value: unknown) => {
      const validator = validators[field]
      if (validator) {
        const error = validator(value)
        setErrors(prev => ({ ...prev, [field]: error }))
        return !error
      }
      return true
    },
    [validators]
  )

  const handleChange = React.useCallback(
    (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value
      setValues(prev => ({ ...prev, [field]: value }))
      if (touched[field]) {
        validateField(field, value)
      }
    },
    [touched, validateField]
  )

  const handleBlur = React.useCallback(
    (field: keyof T) => () => {
      setTouched(prev => ({ ...prev, [field]: true }))
      validateField(field, values[field])
    },
    [validateField, values]
  )

  const validateAll = React.useCallback(() => {
    let isValid = true
    const newErrors: Partial<Record<keyof T, string>> = {}
    
    for (const field of Object.keys(validators) as Array<keyof T>) {
      const error = validators[field]?.(values[field])
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    }
    
    setErrors(newErrors)
    setTouched(Object.keys(validators).reduce((acc, key) => ({ ...acc, [key]: true }), {}))
    return isValid
  }, [validators, values])

  const reset = React.useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    validateField,
    reset,
    setValues,
    isValid: Object.keys(errors).length === 0,
  }
}
