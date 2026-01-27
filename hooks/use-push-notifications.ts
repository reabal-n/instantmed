"use client"

import { useState, useEffect, useCallback } from "react"

interface PushNotificationState {
  isSupported: boolean
  isSubscribed: boolean
  permission: NotificationPermission | "default"
  isLoading: boolean
  error: string | null
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: "default",
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }))
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        
        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          permission: Notification.permission,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        setState(prev => ({
          ...prev,
          isSupported: true,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to check notification status",
        }))
      }
    }

    checkSupport()
  }, [])

  const subscribe = useCallback(async () => {
    if (!state.isSupported) return { success: false, error: "Push notifications not supported" }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const permission = await Notification.requestPermission()
      
      if (permission !== "granted") {
        setState(prev => ({ ...prev, permission, isLoading: false }))
        return { success: false, error: "Permission denied" }
      }

      const registration = await navigator.serviceWorker.ready
      
      // Get VAPID public key from environment
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        throw new Error("VAPID key not configured")
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!response.ok) {
        throw new Error("Failed to save subscription")
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: "granted",
        isLoading: false,
      }))

      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to subscribe"
      setState(prev => ({ ...prev, isLoading: false, error }))
      return { success: false, error }
    }
  }, [state.isSupported])

  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
        
        // Notify server
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }))

      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to unsubscribe"
      setState(prev => ({ ...prev, isLoading: false, error }))
      return { success: false, error }
    }
  }, [])

  return {
    ...state,
    subscribe,
    unsubscribe,
  }
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
