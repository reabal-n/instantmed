"use client"

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
import { Loader2, AlertTriangle, Info, CheckCircle, XCircle, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type DialogVariant = "default" | "destructive" | "warning" | "success" | "info"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  variant?: DialogVariant
  loading?: boolean
  icon?: LucideIcon
  showIcon?: boolean
}

const variantConfig: Record<
  DialogVariant,
  {
    icon: LucideIcon
    iconColor: string
    iconBg: string
    buttonClass: string
  }
> = {
  default: {
    icon: Info,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    buttonClass: "",
  },
  destructive: {
    icon: XCircle,
    iconColor: "text-red-600",
    iconBg: "bg-red-100",
    buttonClass: "bg-red-600 hover:bg-red-700 focus:ring-red-600",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
    buttonClass: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-600",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
    buttonClass: "bg-green-600 hover:bg-green-700 focus:ring-green-600",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    buttonClass: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-600",
  },
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
  loading = false,
  icon,
  showIcon = true,
}: ConfirmationDialogProps) {
  const config = variantConfig[variant]
  const Icon = icon || config.icon

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl max-w-md">
        <AlertDialogHeader className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
          {showIcon && (
            <div
              className={cn(
                "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center animate-scale-in",
                config.iconBg
              )}
            >
              <Icon className={cn("w-6 h-6", config.iconColor)} />
            </div>
          )}
          <div className="space-y-2">
            <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">{description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 gap-2 sm:gap-2">
          <AlertDialogCancel
            className="rounded-xl flex-1 sm:flex-initial transition-all hover:scale-[0.98]"
            disabled={loading}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "rounded-xl flex-1 sm:flex-initial min-w-[100px] transition-all hover:scale-[0.98]",
              config.buttonClass
            )}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Quick confirm dialogs for common use cases
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName = "this item",
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${itemName}?`}
      description={`This action cannot be undone. This will permanently delete ${itemName} and all associated data.`}
      confirmText="Delete"
      variant="destructive"
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}

export function DiscardChangesDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Discard changes?"
      description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      confirmText="Discard"
      cancelText="Keep editing"
      variant="warning"
      onConfirm={onConfirm}
    />
  )
}
