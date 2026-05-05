"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { retryParchmentWebhookFailureAction } from "@/app/actions/parchment-ops"
import { Button } from "@/components/ui/button"

export function RetryParchmentWebhookButton({
  auditLogId,
  disabled = false,
}: {
  auditLogId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await retryParchmentWebhookFailureAction(auditLogId)
          if (result.success) {
            toast.success(result.markedScriptSent ? "Prescription synced and intake completed" : "Prescription synced")
            router.refresh()
            return
          }

          toast.error(result.error || "Parchment retry failed")
        })
      }}
    >
      <RefreshCw className={isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      Retry sync
    </Button>
  )
}
