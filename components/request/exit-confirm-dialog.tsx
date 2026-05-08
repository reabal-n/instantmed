"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { RequestButton } from "./request-button"

interface ExitConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirmExit: () => void
}

export function ExitConfirmDialog({ open, onClose, onConfirmExit }: ExitConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save and finish later?</DialogTitle>
          <DialogDescription>
            Your progress is saved automatically. You can pick up right where you left off any time. Nothing is lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 sm:gap-3 sm:justify-stretch">
          <RequestButton
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Keep going
          </RequestButton>
          <RequestButton
            className="flex-1"
            onClick={onConfirmExit}
          >
            Save &amp; exit
          </RequestButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
