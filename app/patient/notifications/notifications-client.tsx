"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { 
  Bell, 
  FileText, 
  CreditCard, 
  Pill, 
  AlertCircle, 
  CheckCheck,
  Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { formatRelative } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface Notification {
  id: string
  type: "request_update" | "payment" | "document_ready" | "refill_reminder" | "system" | "promotion"
  title: string
  message: string
  action_url?: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

interface NotificationsClientProps {
  notifications: Notification[]
  patientId: string
  fetchError?: string
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "request_update":
      return FileText
    case "payment":
      return CreditCard
    case "document_ready":
      return FileText
    case "refill_reminder":
      return Pill
    default:
      return AlertCircle
  }
}

function getNotificationColor(type: Notification["type"]) {
  switch (type) {
    case "request_update":
      return "bg-blue-50 dark:bg-blue-500/10 text-primary"
    case "payment":
      return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    case "document_ready":
      return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    case "refill_reminder":
      return "bg-amber-50 dark:bg-amber-500/10 text-dawn-600 dark:text-dawn-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function NotificationsClient({ notifications: initialNotifications, patientId, fetchError }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  // Subscribe to new notifications in realtime
  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel("patient-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${patientId}`,
          },
          (payload) => {
            // Add new notification to the top of the list
            const newNotification = payload.new as Notification
            setNotifications((prev) => [newNotification, ...prev])
            toast.info(newNotification.title, {
              description: newNotification.message,
            })
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${patientId}`,
          },
          (payload) => {
            // Update notification in state
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? { ...n, ...payload.new } : n
              )
            )
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, patientId])

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.read) 
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [supabase])

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return

    await supabase.from("notifications").update({ read: true }).in("id", unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success("All notifications marked as read")
  }, [supabase, notifications])

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const now = new Date()
    const todayKey = format(now, "yyyy-MM-dd")
    const yesterdayKey = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd")

    return filteredNotifications.reduce((acc, notification) => {
      const dateKey = format(new Date(notification.created_at), "yyyy-MM-dd")

      let label = format(new Date(notification.created_at), "MMMM d, yyyy")
      if (dateKey === todayKey) label = "Today"
      else if (dateKey === yesterdayKey) label = "Yesterday"

      if (!acc[label]) acc[label] = []
      acc[label].push(notification)
      return acc
    }, {} as Record<string, Notification[]>)
  }, [filteredNotifications])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="rounded-lg">
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" asChild className="rounded-lg">
            <Link href="/patient/settings">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Fetch Error */}
      {fetchError && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
            filter === "unread"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filter === "unread" 
              ? "You're all caught up! Check back later."
              : "We'll notify you when something happens with your requests."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedNotifications).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{dateLabel}</h3>
              <div className="space-y-2">
                {items.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  const iconColor = getNotificationColor(notification.type)

                  const content = (
                    <div
                      className={cn(
                        "glass-card rounded-xl p-4 transition-all hover:shadow-md cursor-pointer",
                        !notification.read && "ring-2 ring-primary/20 bg-primary/5"
                      )}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex gap-4">
                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", iconColor)}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-foreground">{notification.title}</p>
                            {!notification.read && (
                              <Badge className="bg-primary text-primary-foreground text-xs shrink-0">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelative(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )

                  return notification.action_url ? (
                    <Link key={notification.id} href={notification.action_url}>
                      {content}
                    </Link>
                  ) : (
                    <div key={notification.id}>{content}</div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
