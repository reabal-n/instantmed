"use client"

/**
 * Trust Strip - Shared component for repeat-rx intake
 * Shows trust indicators (AHPRA, encryption, privacy)
 */

import { BadgeCheck, Lock, Shield } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { REPEAT_RX_COPY } from "@/lib/microcopy/repeat-rx"

export function TrustStrip() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
              <span>{REPEAT_RX_COPY.trust.ahpra}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>All doctors are AHPRA-registered</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>{REPEAT_RX_COPY.trust.encrypted}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Bank-level encryption protects your data</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>{REPEAT_RX_COPY.trust.private}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>We never sell your data</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
