"use client"

import { RotateCcw } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface DraftRestorationBannerProps {
  onRestore: () => void
  onDiscard: () => void
  serviceName: string
}

export function DraftRestorationBanner({ onRestore, onDiscard, serviceName }: DraftRestorationBannerProps) {
  return (
    <Alert className="mb-4 border-primary/20 bg-primary/5">
      <RotateCcw className="w-4 h-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          You have an unfinished {serviceName} request. Continue where you left off?
        </span>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onDiscard}>
            Start fresh
          </Button>
          <Button size="sm" onClick={onRestore}>
            Continue
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
