"use client"

import { Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface IntakeScriptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parchmentReference: string
  onParchmentReferenceChange: (value: string) => void
  onConfirmScriptSent: () => void
  isPending: boolean
}

export function IntakeScriptDialog({
  open,
  onOpenChange,
  parchmentReference,
  onParchmentReferenceChange,
  onConfirmScriptSent,
  isPending,
}: IntakeScriptDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark Script as Sent</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm that you have sent the prescription via Parchment or other means.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Parchment Reference (optional)</Label>
            <Input
              placeholder="e.g., PAR-12345"
              value={parchmentReference}
              onChange={(e) => onParchmentReferenceChange(e.target.value)}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmScriptSent} disabled={isPending} className="bg-blue-600">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Sent
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
