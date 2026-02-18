"use client"

import { useEffect, useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
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
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get profile ID from Clerk user
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isClerkLoaded) return
      
      if (!clerkUser) {
        setProfileId(null)
        setIsLoading(false)
        return
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("clerk_user_id", clerkUser.id)
          .single()
        
        setProfileId(profile?.id ?? null)
      } catch (_error) {
        setProfileId(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProfile()
  }, [supabase, clerkUser, isClerkLoaded])

  const fetchNotifications = useCallback(async () => {
    if (isLoading || !profileId) {
      setNotifications([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)

      // Fetch notifications using profile ID
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("id, type, title, message, action_url, read, metadata, created_at, expires_at")
        .eq("user_id", profileId)
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
  }, [supabase, profileId, isLoading])

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
    if (!profileId) return
    
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", profileId)
        .eq("read", false)

      if (updateError) throw updateError

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error("Error marking all notifications as read:", err)
      }
    }
  }, [supabase, profileId])

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtime = async () => {
      if (!profileId) return

      channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${profileId}`,
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
  }, [supabase, fetchNotifications, profileId])

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
