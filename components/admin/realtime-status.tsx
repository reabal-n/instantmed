"use client"

/**
 * Real-time Status Indicator
 * Shows connection status and live update notifications for admin dashboard
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Wifi, WifiOff, Bell, RefreshCw } from "lucide-react"
import { useAdminRealtimeStatus } from "@/hooks/use-realtime-admin"
import { cn } from "@/lib/utils"

interface RealtimeStatusProps {
  onRefresh?: () => void
  className?: string
}

export function RealtimeStatus({ onRefresh, className }: RealtimeStatusProps) {
  const { allConnected, hasErrors, intakes, auditLog, dlq } = useAdminRealtimeStatus()
  const [dismissed, setDismissed] = useState(false)

  // Show notification badge when there are new items
  const totalNewItems = intakes.newIntakeCount + auditLog.eventCount + dlq.dlqCount
  const showNotification = totalNewItems > 0 && !dismissed

  const handleRefresh = () => {
    setDismissed(true)
    intakes.clearNewCount()
    // Reset dismissed state after counts are cleared
    setTimeout(() => setDismissed(false), 100)
    if (onRefresh) {
      onRefresh()
    }
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              {allConnected ? (
                <Wifi className="h-4 w-4 text-emerald-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {allConnected ? "Live" : "Offline"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-xs space-y-1">
              <p className="font-medium">Realtime Status</p>
              <div className="flex items-center gap-2">
                <span className={intakes.isConnected ? "text-emerald-500" : "text-red-500"}>●</span>
                Intakes
              </div>
              <div className="flex items-center gap-2">
                <span className={auditLog.isConnected ? "text-emerald-500" : "text-red-500"}>●</span>
                Audit Log
              </div>
              <div className="flex items-center gap-2">
                <span className={dlq.isConnected ? "text-emerald-500" : "text-red-500"}>●</span>
                Webhook DLQ
              </div>
              {hasErrors && (
                <p className="text-red-400 mt-1">Some connections failed</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Notification Badge */}
        {showNotification && totalNewItems > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="relative h-8 px-2"
              >
                <Bell className="h-4 w-4" />
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
                >
                  {totalNewItems > 99 ? "99+" : totalNewItems}
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                <p className="font-medium mb-1">New Updates</p>
                {intakes.newIntakeCount > 0 && (
                  <p>{intakes.newIntakeCount} new intake(s)</p>
                )}
                {auditLog.eventCount > 0 && (
                  <p>{auditLog.eventCount} audit event(s)</p>
                )}
                {dlq.dlqCount > 0 && (
                  <p className="text-red-400">{dlq.dlqCount} DLQ item(s)</p>
                )}
                <p className="text-muted-foreground mt-1">Click to refresh</p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Manual Refresh */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Refresh data
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

/**
 * Compact version for sidebar or smaller areas
 */
export function RealtimeStatusCompact() {
  const { allConnected } = useAdminRealtimeStatus()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                allConnected ? "bg-emerald-500" : "bg-red-500"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {allConnected ? "Live" : "Offline"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {allConnected ? "Connected to realtime updates" : "Disconnected from realtime"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
