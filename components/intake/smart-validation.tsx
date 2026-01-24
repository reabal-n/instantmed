"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ValidationIssue {
  field: string
  severity: "error" | "warning" | "info"
  message: string
  suggestion?: string
}

interface SmartValidationProps {
  formType: "med_cert" | "repeat_rx" | "consult"
  formData: Record<string, unknown>
  onValidationComplete?: (isValid: boolean, issues: ValidationIssue[]) => void
  className?: string
  showOnlyErrors?: boolean
  autoValidate?: boolean
  triggerValidation?: number // Increment to trigger validation
}

export function SmartValidation({
  formType,
  formData,
  onValidationComplete,
  className,
  showOnlyErrors = false,
  autoValidate = true,
  triggerValidation = 0,
}: SmartValidationProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [_isValid, setIsValid] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasValidated, setHasValidated] = useState(false)

  const validate = useCallback(async () => {
    setIsValidating(true)

    try {
      const response = await fetch("/api/ai/form-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, formData }),
      })

      const data = await response.json()

      if (data.error && !data.issues) {
        // API error but not validation issues
        setIssues([])
        setIsValid(true)
        setSummary(null)
      } else {
        setIssues(data.issues || [])
        setIsValid(data.isValid !== false)
        setSummary(data.summary || null)
        onValidationComplete?.(data.isValid !== false, data.issues || [])
      }
      setHasValidated(true)
    } catch {
      // On error, show warning but allow submission (don't silently fail)
      const warningIssue: ValidationIssue = {
        field: "_system",
        severity: "warning",
        message: "Validation check unavailable",
        suggestion: "Please review your information carefully before submitting."
      }
      setIssues([warningIssue])
      setIsValid(true)
      setSummary("Automatic checks temporarily unavailable. Manual review recommended.")
      onValidationComplete?.(true, [warningIssue])
    } finally {
      setIsValidating(false)
    }
  }, [formType, formData, onValidationComplete])

  // Auto-validate on mount and when trigger changes
  useEffect(() => {
    if (autoValidate || triggerValidation > 0) {
      validate()
    }
  }, [autoValidate, triggerValidation, validate])

  // Filter issues based on showOnlyErrors
  const displayIssues = showOnlyErrors 
    ? issues.filter(i => i.severity === "error")
    : issues

  const errorCount = issues.filter(i => i.severity === "error").length
  const warningCount = issues.filter(i => i.severity === "warning").length
  const infoCount = issues.filter(i => i.severity === "info").length

  // Don't render if no issues and has validated
  if (hasValidated && displayIssues.length === 0 && !isValidating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40",
          className
        )}
      >
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span className="text-sm text-green-700 dark:text-green-400">
          {summary || "All checks passed. Ready to submit."}
        </span>
      </motion.div>
    )
  }

  // Don't render anything if not yet validated and not validating
  if (!hasValidated && !isValidating) {
    return null
  }

  const getIssueIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case "info":
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getIssueBgColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40"
      case "warning":
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40"
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40"
      default:
        return "bg-muted/50 border-border"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-3", className)}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors",
          errorCount > 0 
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40"
            : warningCount > 0
            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40"
            : "bg-primary/5 border-primary/20"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            {isValidating ? "Checking your request..." : "Pre-submission check"}
          </span>
          {!isValidating && (
            <div className="flex items-center gap-1.5 ml-2">
              {errorCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  {errorCount} error{errorCount !== 1 ? "s" : ""}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  {warningCount} warning{warningCount !== 1 ? "s" : ""}
                </span>
              )}
              {infoCount > 0 && !showOnlyErrors && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  {infoCount} tip{infoCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              validate()
            }}
            disabled={isValidating}
            className="h-7 px-2"
          >
            <RefreshCw className={cn("w-3 h-3", isValidating && "animate-spin")} />
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Issues list */}
      <AnimatePresence>
        {isExpanded && displayIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {displayIssues.map((issue, index) => (
              <motion.div
                key={`${issue.field}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-3 rounded-xl border",
                  getIssueBgColor(issue.severity)
                )}
              >
                <div className="flex items-start gap-2">
                  {getIssueIcon(issue.severity)}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="text-xs text-muted-foreground">{issue.suggestion}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      {summary && !isValidating && (
        <p className="text-xs text-muted-foreground text-center">{summary}</p>
      )}
    </motion.div>
  )
}

// Export helper to check if form can proceed
export function canProceedWithValidation(issues: ValidationIssue[]): boolean {
  return !issues.some(i => i.severity === "error")
}
