"use client"

import { cn } from "@/lib/utils"
import { motion, useReducedMotion } from "framer-motion"
import { AlertCircle, RefreshCw } from "lucide-react"
import { type Message, type QuickReply, parseQuickReplies, useChatIntakeContext } from "@/components/chat/chat-intake-context"

interface MessageBubbleProps {
  message: Message
  isLatest: boolean
  isLoading: boolean
  onRetry?: () => void
}

export function MessageBubble({ message, isLatest, isLoading, onRetry }: MessageBubbleProps) {
  const prefersReducedMotion = useReducedMotion()
  const isUser = message.role === "user"
  const { cleanContent, quickReplies } = parseQuickReplies(message.content)
  const isError = message.error

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.25,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : isError
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-md"
              : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {isError && (
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Error</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{cleanContent}</p>

        {/* Retry button for error messages */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 mt-2 text-xs font-medium text-destructive hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        )}

        {/* Quick reply buttons - only show on latest assistant message when not loading */}
        {!isUser && !isError && isLatest && !isLoading && quickReplies.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.1, duration: prefersReducedMotion ? 0 : 0.2 }}
            className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30"
            role="group"
            aria-label="Quick reply options"
          >
            {quickReplies.map((reply, idx) => (
              <QuickReplyButton key={idx} reply={reply} index={idx} />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function QuickReplyButton({ reply, index }: { reply: QuickReply; index: number }) {
  const prefersReducedMotion = useReducedMotion()
  const { sendMessage, refocusInput } = useChatIntakeContext()

  const handleClick = () => {
    sendMessage(reply.value)
    setTimeout(() => refocusInput(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      const next = e.currentTarget.nextElementSibling as HTMLButtonElement
      next?.focus()
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      const prev = e.currentTarget.previousElementSibling as HTMLButtonElement
      prev?.focus()
    }
  }

  return (
    <motion.button
      initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: prefersReducedMotion ? 0 : index * 0.03, duration: prefersReducedMotion ? 0 : 0.15 }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`Reply: ${reply.text}`}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-full",
        "bg-background border border-border",
        "hover:bg-primary hover:text-primary-foreground hover:border-primary",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
        "transition-all duration-150",
        "active:scale-[0.98]"
      )}
    >
      {reply.text}
    </motion.button>
  )
}
