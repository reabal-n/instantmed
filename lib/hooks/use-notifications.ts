"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface Notification {
  id: string
  type: "request_update" | "payment" | "document_ready" | "refill_reminder" | "system" | "promotion"
  title: string
  message: string
  action_url?: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
  expires_at?: string
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get current user session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
      } catch (_error) {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const fetchNotifications = useCallback(async () => {
    if (isLoading || !user) {
      setNotifications([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)

      // Get profile using Supabase user ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile) {
        setNotifications([])
        return
      }

      // Fetch notifications
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      setNotifications(data || [])
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error("Error fetching notifications:", err)
      }
      setError(err instanceof Error ? err.message : "Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [supabase, user, isLoading])

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)

      if (updateError) throw updateError

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error marking notification as read:", err)
    }
  }, [supabase])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile) return

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", profile.id)
        .eq("read", false)

      if (updateError) throw updateError

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error("Error marking all notifications as read:", err)
      }
    }
  }, [supabase, user])

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtime = async () => {
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile) return

      channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev])
          }
        )
        .subscribe()
    }

    setupRealtime()
    fetchNotifications()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, fetchNotifications, user])

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
