"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, RefreshCw, Copy, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AiReviewSummaryProps {
  requestId: string
  requestType: "med_cert" | "repeat_rx" | "consult"
  className?: string
  autoGenerate?: boolean
}

export function AiReviewSummary({
  requestId,
  requestType,
  className,
  autoGenerate = true,
}: AiReviewSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateSummary = useCallback(async () => {
    if (!requestId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/review-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, requestType }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setSummary(null)
      } else {
        setSummary(data.summary)
      }
    } catch {
      setError("Failed to generate summary")
      setSummary(null)
    } finally {
      setIsLoading(false)
    }
  }, [requestId, requestType])

  useEffect(() => {
    if (autoGenerate && requestId) {
      generateSummary()
    }
  }, [autoGenerate, requestId, generateSummary])

  const handleCopy = async () => {
    if (!summary) return
    
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API failed
    }
  }

  if (!requestId) {
    return null
  }

  return (
    <div className={cn(
      "rounded-xl border bg-linear-to-br from-primary/5 to-primary/10 p-4 space-y-3",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="w-4 h-4" />
          <span>AI Summary</span>
        </div>
        <div className="flex items-center gap-1">
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <Check className="w-3 h-3 mr-1" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSummary}
            disabled={isLoading}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
            {isLoading ? "Generating..." : "Refresh"}
          </Button>
        </div>
      </div>

      {isLoading && !summary && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span>Analyzing request...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <div className="text-sm text-foreground leading-relaxed">
          {summary}
        </div>
      )}

      <p className="text-xs text-muted-foreground/60">
        AI-generated summary for quick reference. Always verify against full intake data.
      </p>
    </div>
  )
}
