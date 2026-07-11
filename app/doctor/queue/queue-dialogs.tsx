"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { QueueDialogState } from "./use-queue-dialogs"

export function QueueDialogs({ dialogs }: { dialogs: QueueDialogState }) {
  const {
    declineDialog,
    setDeclineDialog,
    declineReasonCode,
    setDeclineReasonCode,
    declineReasonNote,
    setDeclineReasonNote,
    declineTemplates,
    handleDecline,
    handleDeclineTemplateChange,
    requiresNote,
    infoDialog,
    setInfoDialog,
    infoTemplateCode,
    infoMessage,
    setInfoMessage,
    infoTemplates,
    handleRequestInfo,
    handleInfoTemplateChange,
    flagDialog,
    setFlagDialog,
    flagReason,
    setFlagReason,
    handleFlag,
    isPending,
  } = dialogs

  return (
    <>
      <Dialog
        open={!!declineDialog}
        onOpenChange={() => {
          setDeclineDialog(null)
          setDeclineReasonCode("")
          setDeclineReasonNote("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>Select a reason. The patient will be notified by email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-2.5 text-sm font-medium">Reason</p>
              <div className="flex flex-wrap gap-2">
                {declineTemplates.map((template) => (
                  <button
                    key={template.code}
                    onClick={() => handleDeclineTemplateChange(template.code)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      declineReasonCode === template.code
                        ? "border-destructive bg-destructive text-destructive-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
            {declineReasonCode ? (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Note {requiresNote ? "(required)" : "(optional)"}
                </label>
                <Textarea
                  placeholder="Additional details for the patient..."
                  value={declineReasonNote}
                  onChange={(event) => setDeclineReasonNote(event.target.value)}
                  className="min-h-[80px]"
                  autoFocus
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeclineDialog(null)
                setDeclineReasonCode("")
                setDeclineReasonNote("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={!declineReasonCode || (requiresNote && !declineReasonNote.trim()) || isPending}
            >
              Decline & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!infoDialog}
        onOpenChange={() => {
          setInfoDialog(null)
          setInfoMessage("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request More Information</DialogTitle>
            <DialogDescription>The patient will be notified by email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">What do you need?</label>
              <Select value={infoTemplateCode} onValueChange={handleInfoTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {infoTemplates.map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Message to patient</label>
              <Textarea
                placeholder="Explain what you need..."
                value={infoMessage}
                onChange={(event) => setInfoMessage(event.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInfoDialog(null)
                setInfoMessage("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRequestInfo} disabled={!infoTemplateCode || !infoMessage.trim() || isPending}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!flagDialog} onOpenChange={() => setFlagDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag for Follow-up</DialogTitle>
            <DialogDescription>Add a note about why this case needs follow-up.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Follow-up reason..."
            value={flagReason}
            onChange={(event) => setFlagReason(event.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleFlag} disabled={!flagReason.trim() || isPending}>
              Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
