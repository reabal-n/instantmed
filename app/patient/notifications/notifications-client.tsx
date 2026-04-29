"use client"

import type { RealtimeChannel } from "@supabase/supabase-js"
import { format } from "date-fns"
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CreditCard,
  FileText,
  Pill,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { useCallback,useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { DashboardPageHeader } from "@/components/dashboard"
import { PatientErrorAlert } from "@/components/patient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { formatRelative } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

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
      return "bg-info-light text-primary"
    case "payment":
      return "bg-success-light text-success"
    case "document_ready":
      return "bg-success-light text-success"
    case "refill_reminder":
      return "bg-warning-light text-warning"
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
      <DashboardPageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : "All caught up."}
        actions={
          <>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/patient/settings">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Link>
            </Button>
          </>
        }
      />

      {/* Fetch Error */}
      {fetchError && <PatientErrorAlert error={fetchError} />}

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
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description={
            filter === "unread"
              ? "You're all caught up! Check back later."
              : "We'll notify you when something happens with your requests."
          }
        />
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
                        "bg-white dark:bg-card border border-border/50 dark:border-white/15",
                        "shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-4",
                        "transition-[transform,box-shadow,border-color] duration-300",
                        "hover:shadow-md hover:shadow-primary/[0.06] hover:border-primary/40 cursor-pointer",
                        !notification.read && "ring-2 ring-primary/20 bg-primary/[0.04]"
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
