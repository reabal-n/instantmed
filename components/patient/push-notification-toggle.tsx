"use client"

import { Bell, BellOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { toast } from "sonner"

interface PushNotificationToggleProps {
  variant?: "button" | "switch"
  className?: string
}

export function PushNotificationToggle({ 
  variant = "switch",
  className,
}: PushNotificationToggleProps) {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications()

  if (!isSupported) {
    return null
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const result = await unsubscribe()
      if (result.success) {
        toast.success("Notifications disabled")
      } else {
        toast.error(result.error || "Failed to disable notifications")
      }
    } else {
      const result = await subscribe()
      if (result.success) {
        toast.success("Notifications enabled! You'll be notified when your request status changes.")
      } else if (permission === "denied") {
        toast.error("Notifications blocked. Please enable them in your browser settings.")
      } else {
        toast.error(result.error || "Failed to enable notifications")
      }
    }
  }

  if (variant === "button") {
    return (
      <Button
        variant={isSubscribed ? "secondary" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <>
            <Bell className="h-4 w-4 mr-2" />
            Notifications On
          </>
        ) : (
          <>
            <BellOff className="h-4 w-4 mr-2" />
            Enable Notifications
          </>
        )}
      </Button>
    )
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <Label htmlFor="push-notifications" className="font-medium">
            Push Notifications
          </Label>
          <p className="text-sm text-muted-foreground">
            Get notified when your request status changes
          </p>
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Switch
          id="push-notifications"
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={permission === "denied"}
        />
      )}
    </div>
  )
}
