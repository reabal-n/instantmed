"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Message Status Indicator
 * 
 * Shows delivery and read status for messages:
 * - Sending: No icon (or spinner)
 * - Sent: Single check
 * - Delivered: Double check (gray)
 * - Read: Double check (blue)
 */
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed"

interface MessageStatusIndicatorProps {
  status: MessageStatus
  className?: string
  showLabel?: boolean
}

export function MessageStatusIndicator({ status, className, showLabel = false }: MessageStatusIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case "sending":
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
          />
        )
      case "sent":
        return <Check className="h-3.5 w-3.5" />
      case "delivered":
        return <CheckCheck className="h-3.5 w-3.5" />
      case "read":
        return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
      case "failed":
        return (
          <span className="text-[10px] text-red-500 font-medium">Failed</span>
        )
      default:
        return null
    }
  }

  const getLabel = () => {
    switch (status) {
      case "sending": return "Sending"
      case "sent": return "Sent"
      case "delivered": return "Delivered"
      case "read": return "Read"
      case "failed": return "Failed"
      default: return ""
    }
  }

  return (
    <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
      {getIcon()}
      {showLabel && (
        <span className="text-[10px]">{getLabel()}</span>
      )}
    </div>
  )
}

/**
 * Typing Indicator
 * 
 * Animated dots showing someone is typing.
 */
interface TypingIndicatorProps {
  isTyping: boolean
  userName?: string
  className?: string
}

export function TypingIndicator({ isTyping, userName, className }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
        >
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-muted">
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
              className="w-2 h-2 rounded-full bg-muted-foreground/60"
            />
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
              className="w-2 h-2 rounded-full bg-muted-foreground/60"
            />
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
              className="w-2 h-2 rounded-full bg-muted-foreground/60"
            />
          </div>
          {userName && (
            <span className="text-xs">{userName} is typing...</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Read Receipt Avatars
 * 
 * Shows small avatars of users who have read the message.
 */
interface ReadReceiptAvatarsProps {
  readers: Array<{ id: string; name: string; avatar?: string }>
  maxDisplay?: number
  className?: string
}

export function ReadReceiptAvatars({ readers, maxDisplay = 3, className }: ReadReceiptAvatarsProps) {
  if (readers.length === 0) return null

  const displayReaders = readers.slice(0, maxDisplay)
  const remaining = readers.length - maxDisplay

  return (
    <div className={cn("flex items-center -space-x-1", className)}>
      {displayReaders.map((reader) => (
        <div
          key={reader.id}
          className="w-4 h-4 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-medium"
          title={`Read by ${reader.name}`}
        >
          {reader.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element -- Dynamic avatar URLs from external sources */
            <img src={reader.avatar} alt={reader.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            reader.name.charAt(0).toUpperCase()
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-4 h-4 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-medium">
          +{remaining}
        </div>
      )}
    </div>
  )
}

/**
 * Message Time with Read Status
 * 
 * Combined timestamp and read status component.
 */
interface MessageTimeProps {
  timestamp: Date | string
  status?: MessageStatus
  isOwn?: boolean
  className?: string
}

export function MessageTime({ timestamp, status, isOwn = false, className }: MessageTimeProps) {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp
  const timeString = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div className={cn("flex items-center gap-1 text-[10px] text-muted-foreground", className)}>
      <span>{timeString}</span>
      {isOwn && status && <MessageStatusIndicator status={status} />}
    </div>
  )
}

/**
 * Hook for managing typing indicator state
 */
export function useTypingIndicator(
  sendTypingStatus: (isTyping: boolean) => void,
  debounceMs = 1000
) {
  const [isTyping, setIsTyping] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const startTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      sendTypingStatus(true)
    }

    // Reset timeout
    if (timeoutId) clearTimeout(timeoutId)
    
    const newTimeoutId = setTimeout(() => {
      setIsTyping(false)
      sendTypingStatus(false)
    }, debounceMs)
    
    setTimeoutId(newTimeoutId)
  }

  const stopTyping = () => {
    if (timeoutId) clearTimeout(timeoutId)
    setIsTyping(false)
    sendTypingStatus(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [timeoutId])

  return { isTyping, startTyping, stopTyping }
}

/**
 * Hook for managing read receipts
 */
export function useReadReceipts(
  messageId: string,
  markAsRead: (messageId: string) => Promise<void>
) {
  const [isRead, setIsRead] = useState(false)

  useEffect(() => {
    // Use Intersection Observer to detect when message is visible
    const observer = new IntersectionObserver(
      async (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isRead) {
          try {
            await markAsRead(messageId)
            setIsRead(true)
          } catch {
            // Silently fail - read receipt is not critical
          }
        }
      },
      { threshold: 0.5 }
    )

    // Target element should be set by the component using this hook
    return () => observer.disconnect()
  }, [messageId, markAsRead, isRead])

  return { isRead, setIsRead }
}
