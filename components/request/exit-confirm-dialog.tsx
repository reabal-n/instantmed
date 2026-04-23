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
          <DialogTitle>Leave this request?</DialogTitle>
          <DialogDescription>
            Your progress has been saved as a draft. You can continue later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 sm:gap-3 sm:justify-stretch">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Keep editing
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirmExit}
          >
            Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
