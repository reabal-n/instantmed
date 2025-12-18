"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Edit3, Loader2, Check, X, AlertCircle } from "lucide-react"
import { submitRequestAmendmentAction } from "@/app/actions/amend-request"

interface AmendmentFormProps {
  requestId: string
  canAmend: boolean
  className?: string
}

export function AmendmentForm({ requestId, canAmend, className }: AmendmentFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = () => {
    if (!notes.trim()) return

    startTransition(async () => {
      const response = await submitRequestAmendmentAction(requestId, {
        additionalNotes: notes.trim(),
      })

      setResult({
        success: response.success,
        message: response.success ? response.message! : response.error!,
      })

      if (response.success) {
        setNotes("")
        setTimeout(() => {
          setIsOpen(false)
          setResult(null)
        }, 2000)
      }
    })
  }

  if (!canAmend) {
    return null
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("gap-2", className)}
      >
        <Edit3 className="h-4 w-4" />
        Add information
      </Button>
    )
  }

  return (
    <div className={cn("p-4 rounded-xl border bg-muted/30 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Edit3 className="h-4 w-4" />
          Add additional information
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false)
            setResult(null)
          }}
          className="h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Add any additional details the doctor should know. This will be appended to your request.
      </p>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g., I forgot to mention that I also have..."
        rows={3}
        className="resize-none text-sm"
        disabled={isPending}
      />

      {result && (
        <div
          className={cn(
            "flex items-center gap-2 text-sm p-2 rounded-lg",
            result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}
        >
          {result.success ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {result.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || !notes.trim()}
          className="gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit"
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false)
            setNotes("")
            setResult(null)
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
