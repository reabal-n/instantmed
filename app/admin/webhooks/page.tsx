import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { WebhookMonitoringClient } from "./webhook-monitoring-client"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Webhook Monitoring | Admin",
  description: "Monitor webhook deliveries and failures",
}

async function getWebhookStats() {
  const supabase = await createClient()
  
  // Get webhook events from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { data: events, error } = await supabase
    .from("webhook_events")
    .select("id, event_type, status, endpoint, payload, response_status, response_body, attempts, created_at, delivered_at")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(100)
  
  if (error) {
    // Log error for debugging
    void error
    return { events: [], stats: { total: 0, success: 0, failed: 0, pending: 0 } }
  }
  
  const stats = {
    total: events?.length || 0,
    success: events?.filter(e => e.status === "delivered").length || 0,
    failed: events?.filter(e => e.status === "failed").length || 0,
    pending: events?.filter(e => e.status === "pending").length || 0,
  }
  
  return { events: events || [], stats }
}

async function getDLQItems() {
  const supabase = await createClient()
  
  const { data: dlqItems, error } = await supabase
    .from("webhook_dlq")
    .select("id, event_type, payload, error_message, original_event_id, retry_count, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
  
  if (error) {
    // Log error for debugging
    void error
    return []
  }
  
  return dlqItems || []
}

export default async function WebhookMonitoringPage() {
  const [{ events, stats }, dlqItems] = await Promise.all([
    getWebhookStats(),
    getDLQItems(),
  ])
  
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webhook Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor webhook deliveries, failures, and dead letter queue
        </p>
      </div>
      
      <Suspense fallback={<WebhookSkeleton />}>
        <WebhookMonitoringClient 
          initialEvents={events} 
          initialStats={stats}
          initialDLQ={dlqItems}
        />
      </Suspense>
    </div>
  )
}

function WebhookSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  )
}
