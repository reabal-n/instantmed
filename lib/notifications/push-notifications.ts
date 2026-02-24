/**
 * Push Notification System
 * 
 * Handles push notification subscription, management, and delivery
 * for the InstantMed PWA.
 */

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("push-notifications")

export interface PushSubscriptionJSON {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: NotificationAction[]
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

class PushNotificationManager {
  private static instance: PushNotificationManager
  private subscription: PushSubscription | null = null
  private isSupported: boolean

  private constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window
  }

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager()
    }
    return PushNotificationManager.instance
  }

  // Check if push notifications are supported
  isPushSupported(): boolean {
    return this.isSupported
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      logger.warn("Push notifications not supported")
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      logger.info("Notification permission requested", { permission })
      return permission
    } catch (error) {
      logger.error("Failed to request notification permission", { error })
      return 'denied'
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported) {
      logger.warn("Push notifications not supported")
      return null
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.ready
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(this.urlBase64ToUint8Array(this.getVAPIDPublicKey()))
      })

      this.subscription = subscription
      logger.info("Successfully subscribed to push notifications", { 
        endpoint: subscription.endpoint 
      })

      // Save subscription to server
      await this.saveSubscriptionToServer(subscription)
      
      return subscription
    } catch (error) {
      logger.error("Failed to subscribe to push notifications", { error })
      return null
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.subscription) {
      logger.warn("No active subscription to unsubscribe")
      return false
    }

    try {
      await this.subscription.unsubscribe()
      await this.removeSubscriptionFromServer(this.subscription)
      
      this.subscription = null
      logger.info("Successfully unsubscribed from push notifications")
      return true
    } catch (error) {
      logger.error("Failed to unsubscribe from push notifications", { error })
      return false
    }
  }

  // Get current subscription
  getSubscription(): PushSubscription | null {
    return this.subscription
  }

  // Load existing subscription
  async loadSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported) return null

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        this.subscription = subscription
        logger.info("Loaded existing push subscription")
      }
      
      return subscription
    } catch (error) {
      logger.error("Failed to load push subscription", { error })
      return null
    }
  }

  // Send local notification (for immediate feedback)
  sendLocalNotification(payload: NotificationPayload): void {
    if (!('Notification' in window)) {
      logger.warn("Notifications not supported")
      return
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/apple-icon.png',
        badge: payload.badge || '/apple-icon.png',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: false,
        silent: false
      })

      // Handle notification click
      notification.onclick = () => {
        notification.close()
        this.handleNotificationClick(payload)
      }

      logger.info("Local notification sent", { title: payload.title })
    } catch (error) {
      logger.error("Failed to send local notification", { error })
    }
  }

  // Send push notification via service worker
  async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.subscription) {
      logger.warn("No subscription available for push notification")
      return false
    }

    try {
      await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription,
          payload
        })
      })

      logger.info("Push notification sent", { title: payload.title })
      return true
    } catch (error) {
      logger.error("Failed to send push notification", { error })
      return false
    }
  }

  // Handle notification click
  private handleNotificationClick(payload: NotificationPayload): void {
    // Navigate to relevant page based on notification data
    if (payload.data?.url) {
      window.location.href = String(payload.data.url)
    } else if (payload.data?.intakeId) {
      window.location.href = `/patient/intakes/${String(payload.data.intakeId)}`
    } else if (payload.data?.requestId) {
      window.location.href = `/track/${String(payload.data.requestId)}` // Legacy fallback
    }

    logger.info("Notification clicked", { data: payload.data })
  }

  // Save subscription to server
  private async saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionJson = subscription.toJSON() as PushSubscriptionJSON
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          keys: subscriptionJson.keys
        })
      })
    } catch (error) {
      logger.error("Failed to save subscription to server", { error })
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      })
    } catch (error) {
      logger.error("Failed to remove subscription from server", { error })
    }
  }

  // Convert VAPID key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  // Get VAPID public key
  private getVAPIDPublicKey(): string {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  }
}

// Export singleton instance
export const pushNotificationManager = PushNotificationManager.getInstance()

// React hook for easy usage
export function usePushNotifications() {
  const manager = PushNotificationManager.getInstance()

  return {
    isSupported: manager.isPushSupported(),
    requestPermission: manager.requestPermission.bind(manager),
    subscribe: manager.subscribeToPush.bind(manager),
    unsubscribe: manager.unsubscribeFromPush.bind(manager),
    getSubscription: manager.getSubscription.bind(manager),
    loadSubscription: manager.loadSubscription.bind(manager),
    sendLocal: manager.sendLocalNotification.bind(manager),
    sendPush: manager.sendPushNotification.bind(manager)
  }
}

// Notification templates for common use cases
export const NotificationTemplates = {
  // Certificate ready
  certificateReady: (intakeId: string): NotificationPayload => ({
    title: 'Certificate Ready!',
    body: 'Your medical certificate is ready for download.',
    icon: '/apple-icon.png',
    tag: 'certificate-ready',
    data: { intakeId, url: `/patient/intakes/${intakeId}` }
  }),

  // Prescription ready
  prescriptionReady: (prescriptionId: string): NotificationPayload => ({
    title: 'eScript Ready',
    body: 'Your eScript has been sent to your phone via SMS.',
    icon: '/apple-icon.png',
    tag: 'prescription-ready',
    data: { prescriptionId, url: `/patient/prescriptions` }
  }),

  // Doctor review complete
  reviewComplete: (intakeId: string): NotificationPayload => ({
    title: 'Doctor Review Complete',
    body: 'Your consultation has been reviewed by a doctor.',
    icon: '/apple-icon.png',
    tag: 'review-complete',
    data: { intakeId, url: `/track/${intakeId}` }
  }),

  // Payment required
  paymentRequired: (intakeId: string): NotificationPayload => ({
    title: 'Payment Required',
    body: 'Complete your payment to receive your certificate.',
    icon: '/apple-icon.png',
    tag: 'payment-required',
    data: { intakeId, url: `/patient/payment/${intakeId}` }
  }),

  // Appointment reminder
  appointmentReminder: (appointmentTime: string): NotificationPayload => ({
    title: 'Appointment Reminder',
    body: `Your appointment is scheduled for ${appointmentTime}`,
    icon: '/apple-icon.png',
    tag: 'appointment-reminder',
    data: { url: '/patient/appointments' }
  }),

  // System maintenance
  systemMaintenance: (message: string): NotificationPayload => ({
    title: 'System Maintenance',
    body: message,
    icon: '/apple-icon.png',
    tag: 'system-maintenance',
    data: { url: '/status' }
  }),

  // New message
  newMessage: (senderName: string, messagePreview: string): NotificationPayload => ({
    title: `New message from ${senderName}`,
    body: messagePreview,
    icon: '/apple-icon.png',
    tag: 'new-message',
    data: { url: '/patient/messages' }
  })
}
