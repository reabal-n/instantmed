"use client"

import { RefreshCw } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { retryParchmentPatientSyncAction } from "@/app/actions/parchment"
import { Button } from "@/components/ui/button"

export function RetryParchmentSyncButton({ intakeId }: { intakeId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await retryParchmentPatientSyncAction(intakeId)
          if (result.success) {
            toast.success("Parchment sync retried")
          } else {
            toast.error(result.error || "Parchment sync failed")
          }
        })
      }}
    >
      <RefreshCw className={isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      Retry sync
    </Button>
  )
}
