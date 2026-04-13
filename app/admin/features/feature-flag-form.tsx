"use client"

import { AlertTriangle,Loader2 } from "lucide-react"

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
import type { FlagKey } from "@/lib/data/types/feature-flags"
import { FLAG_KEYS } from "@/lib/data/types/feature-flags"

const KILL_SWITCH_LABELS: Record<string, string> = {
  [FLAG_KEYS.DISABLE_MED_CERT]: "Medical Certificates",
  [FLAG_KEYS.DISABLE_REPEAT_SCRIPTS]: "Repeat Prescriptions",
  [FLAG_KEYS.DISABLE_CONSULTS]: "Consultations",
}

interface KillSwitchConfirmDialogProps {
  pendingToggle: { key: FlagKey; currentValue: boolean } | null
  isSaving: string | null
  onConfirm: (key: FlagKey, currentValue: boolean) => void
  onClose: () => void
}

export function KillSwitchConfirmDialog({
  pendingToggle,
  isSaving,
  onConfirm,
  onClose,
}: KillSwitchConfirmDialogProps) {
  return (
    <AlertDialog open={!!pendingToggle} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {pendingToggle?.key === FLAG_KEYS.MAINTENANCE_MODE
              ? "Enable Maintenance Mode?"
              : `Disable ${pendingToggle ? KILL_SWITCH_LABELS[pendingToggle.key] : "Service"}?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {pendingToggle?.key === FLAG_KEYS.MAINTENANCE_MODE ? (
              <>
                <p>
                  This will immediately close the entire platform. No patients will be able to submit new requests or make payments.
                </p>
                <p className="font-medium text-warning">
                  Existing requests will continue processing. Remember to disable maintenance mode when you&apos;re done.
                </p>
              </>
            ) : (
              <>
                <p>
                  This will immediately prevent patients from creating new{" "}
                  {pendingToggle ? KILL_SWITCH_LABELS[pendingToggle.key].toLowerCase() : "requests"}.
                </p>
                <p className="font-medium text-warning">
                  Existing requests will continue processing, but no new ones can be submitted.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (pendingToggle) {
                onConfirm(pendingToggle.key, pendingToggle.currentValue)
                onClose()
              }
            }}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {pendingToggle?.key === FLAG_KEYS.MAINTENANCE_MODE ? "Enable Maintenance Mode" : "Disable Service"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
