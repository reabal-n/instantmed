"use client"

/**
 * Reusable typed-confirmation dialog primitive.
 *
 * Use this for destructive operator actions where a misclick or
 * thinko could cause real harm — refunds, cert revocations, account
 * closures, manual paid marks. The continue button is disabled until
 * the operator types the `requiredText` token (case-sensitive by
 * default).
 *
 * Why typed confirmation, not just a second click:
 * - Double-confirm dialogs train operators to muscle-click through
 *   both. Typed confirmation breaks the muscle-memory loop and forces
 *   a deliberate moment of attention.
 * - The required token can be a fixed verb (REFUND, REVOKE) or a
 *   dynamic identifier (the patient name, the intake reference). A
 *   dynamic token catches "wrong tab" errors better than a fixed one.
 *
 * Usage:
 *   <TypedConfirmDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Issue refund"
 *     description="This processes a full Stripe refund and emails the patient."
 *     requiredText="REFUND"
 *     confirmLabel="Issue refund"
 *     destructive
 *     onConfirm={handleRefund}
 *     isPending={isPending}
 *   />
 */

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface TypedConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dialog heading. */
  title: string
  /**
   * Short explanation of what the action does, including any
   * irreversibility / side-effect language. Plain string; if you need
   * rich content compose your own AlertDialog instead.
   */
  description: string
  /** The exact string the operator must type to enable confirm. */
  requiredText: string
  /** Optional smaller label rendered above the input. Defaults to a sensible message. */
  inputLabel?: string
  /** Confirm button text. Default: "Confirm". */
  confirmLabel?: string
  /** Cancel button text. Default: "Cancel". */
  cancelLabel?: string
  /**
   * If true (default), the confirm button uses destructive styling.
   * Set false for non-destructive but still-typed actions.
   */
  destructive?: boolean
  /**
   * If true, comparison ignores case and surrounding whitespace.
   * Default false — strict match.
   */
  caseInsensitive?: boolean
  /** Confirm handler. May be async; while pending the dialog stays open. */
  onConfirm: () => void | Promise<void>
  /** Disables both buttons while the action is in flight. */
  isPending?: boolean
}

export function TypedConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  requiredText,
  inputLabel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  caseInsensitive = false,
  onConfirm,
  isPending = false,
}: TypedConfirmDialogProps) {
  const [typed, setTyped] = useState("")

  // Reset the input every time the dialog closes so a stale typed
  // value doesn't pre-arm the next destructive action.
  useEffect(() => {
    if (!open) setTyped("")
  }, [open])

  const normalize = (value: string) =>
    caseInsensitive ? value.trim().toLowerCase() : value.trim()
  const matches = normalize(typed) === normalize(requiredText)

  const handleOpenChange = (next: boolean) => {
    if (isPending) return
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="typed-confirm-input" className="text-xs text-muted-foreground">
            {inputLabel ?? (
              <>
                Type{" "}
                <span className="font-mono font-semibold text-foreground">
                  {requiredText}
                </span>{" "}
                to continue
              </>
            )}
          </Label>
          <Input
            id="typed-confirm-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={requiredText}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="font-mono"
            disabled={isPending}
            data-testid="typed-confirm-input"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!matches || isPending}
            data-testid="typed-confirm-action"
            className={cn(
              destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
