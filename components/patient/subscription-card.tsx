"use client"

import { Calendar, CreditCard, ExternalLink,RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SubscriptionCardProps {
  subscription: {
    id: string
    status: string
    credits_remaining: number
    current_period_end: string | null
  }
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false)

  const nextBilling = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—"

  const handleManage = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/customer-portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error("Unable to open subscription management")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Repeat Script Subscription</h3>
        </div>
        <Badge
          variant={subscription.status === "active" ? "default" : "secondary"}
          className="text-xs"
        >
          {subscription.status === "active" ? "Active" : subscription.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5" />
          <span>
            {subscription.credits_remaining > 0
              ? `${subscription.credits_remaining} script credit remaining`
              : "No credits. Next script at full price."}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>Renews {nextBilling}</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={handleManage}
        disabled={loading}
      >
        {loading ? "Opening..." : "Manage subscription"}
        <ExternalLink className="w-3 h-3 ml-1.5" />
      </Button>
    </div>
  )
}
