"use client"

/**
 * Send to Employer Dialog
 * 
 * Allows patients to forward their approved medical certificate to an employer.
 * Collects employer details and optional note, then sends via server action.
 */

import * as React from "react"
import { useState, useTransition } from "react"
import { Mail, Building2, User, MessageSquare, Send, AlertCircle, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { sendEmployerEmail } from "@/app/actions/send-employer-email"

interface SendToEmployerDialogProps {
  intakeId: string
  patientName: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function SendToEmployerDialog({
  intakeId,
  patientName: _patientName,
  trigger,
  onSuccess,
}: SendToEmployerDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Form state
  const [employerEmail, setEmployerEmail] = useState("")
  const [employerName, setEmployerName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [note, setNote] = useState("")
  
  // Result state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [remainingSends, setRemainingSends] = useState<number | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    startTransition(async () => {
      const result = await sendEmployerEmail({
        intakeId,
        employerEmail,
        employerName: employerName || undefined,
        companyName: companyName || undefined,
        note: note || undefined,
      })

      if (result.success) {
        setSuccess(true)
        setRemainingSends(result.remainingSends ?? null)
        onSuccess?.()
      } else {
        setError(result.error || "Failed to send email")
        if (result.remainingSends !== undefined) {
          setRemainingSends(result.remainingSends)
        }
      }
    })
  }

  const handleClose = () => {
    setOpen(false)
    // Reset form after animation
    setTimeout(() => {
      setEmployerEmail("")
      setEmployerName("")
      setCompanyName("")
      setNote("")
      setError(null)
      setSuccess(false)
      setRemainingSends(null)
    }, 200)
  }

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <Mail className="h-4 w-4" />
      Email to Employer
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {success ? (
          // Success state
          <div className="py-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl mb-2">Email Sent</DialogTitle>
            <DialogDescription className="mb-6">
              Your medical certificate has been sent to {employerEmail}. They'll receive a secure
              download link that expires in 7 days.
            </DialogDescription>
            {remainingSends !== null && remainingSends > 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                You can send {remainingSends} more email{remainingSends !== 1 ? "s" : ""} for this certificate today.
              </p>
            )}
            <Button onClick={handleClose}>Done</Button>
          </div>
        ) : (
          // Form state
          <>
            <DialogHeader>
              <DialogTitle>Send Certificate to Employer</DialogTitle>
              <DialogDescription>
                We'll send your medical certificate directly to your employer with a secure download link.
                They won't have access to your InstantMed account.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Employer Email (required) */}
              <div className="space-y-2">
                <Label htmlFor="employerEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Employer Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="employerEmail"
                  type="email"
                  placeholder="hr@company.com"
                  value={employerEmail}
                  onChange={(e) => setEmployerEmail(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              {/* Employer Name (optional) */}
              <div className="space-y-2">
                <Label htmlFor="employerName" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Recipient Name <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="employerName"
                  type="text"
                  placeholder="John Smith"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  disabled={isPending}
                  maxLength={100}
                />
              </div>

              {/* Company Name (optional) */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Company Name <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Corporation"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isPending}
                  maxLength={100}
                />
              </div>

              {/* Note (optional) */}
              <div className="space-y-2">
                <Label htmlFor="note" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Add a Note <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="note"
                  placeholder="Please find my medical certificate attached..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isPending}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {note.length}/500
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Info box */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-medium">What they'll receive:</p>
                <ul className="mt-1 space-y-1 text-blue-700">
                  <li>• Secure download link (expires in 7 days)</li>
                  <li>• Certificate verification code</li>
                  <li>• Your name and absence dates</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !employerEmail} className="gap-2">
                  {isPending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Certificate
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
