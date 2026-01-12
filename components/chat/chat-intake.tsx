"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Send, 
  X, 
  MessageCircle, 
  Stethoscope,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const CHAT_STORAGE_KEY = "instantmed_chat_history"
const CHAT_EXPIRY_HOURS = 24

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface StoredChat {
  messages: Message[]
  timestamp: number
}

interface QuickReply {
  text: string
  value: string
}

function parseQuickReplies(content: string): { cleanContent: string; quickReplies: QuickReply[] } {
  const quickReplies: QuickReply[] = []
  
  // Match [Button Text] patterns
  const buttonRegex = /\[([^\]]+)\]/g
  let match
  
  while ((match = buttonRegex.exec(content)) !== null) {
    quickReplies.push({
      text: match[1],
      value: match[1],
    })
  }
  
  // Remove button patterns from content for cleaner display
  const cleanContent = content.replace(/\[([^\]]+)\]\s*/g, "").trim()
  
  return { cleanContent, quickReplies }
}

function MessageBubble({ message, isLatest }: { message: Message; isLatest: boolean }) {
  const isUser = message.role === "user"
  const { cleanContent, quickReplies } = parseQuickReplies(message.content)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
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
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{cleanContent}</p>
        
        {/* Quick reply buttons - only show on latest assistant message */}
        {!isUser && isLatest && quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30">
            {quickReplies.map((reply, idx) => (
              <QuickReplyButton key={idx} reply={reply} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function QuickReplyButton({ reply }: { reply: QuickReply }) {
  const { sendMessage } = useChatContext()
  
  return (
    <button
      onClick={() => sendMessage(reply.value)}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-full",
        "bg-background border border-border",
        "hover:bg-primary hover:text-primary-foreground hover:border-primary",
        "transition-all duration-200",
        "active:scale-95"
      )}
    >
      {reply.text}
    </button>
  )
}

// Context for quick reply buttons to access sendMessage
import { createContext, useContext } from "react"

const ChatContext = createContext<{ sendMessage: (text: string) => void }>({
  sendMessage: () => {},
})

function useChatContext() {
  return useContext(ChatContext)
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1">
          <motion.span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  )
}

// Save chat to localStorage
function saveChat(messages: Message[]) {
  if (typeof window === "undefined") return
  const data: StoredChat = { messages, timestamp: Date.now() }
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data))
}

// Load chat from localStorage
function loadChat(): Message[] | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!stored) return null
    const data: StoredChat = JSON.parse(stored)
    // Check if expired
    const expiryMs = CHAT_EXPIRY_HOURS * 60 * 60 * 1000
    if (Date.now() - data.timestamp > expiryMs) {
      localStorage.removeItem(CHAT_STORAGE_KEY)
      return null
    }
    return data.messages
  } catch {
    return null
  }
}

// Clear chat from localStorage
function clearChat() {
  if (typeof window === "undefined") return
  localStorage.removeItem(CHAT_STORAGE_KEY)
}

export function ChatIntake({ 
  isOpen, 
  onClose,
  onComplete,
}: { 
  isOpen: boolean
  onClose: () => void
  onComplete?: (data: Record<string, unknown>) => void
}) {
  const _router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveChat(messages)
    }
  }, [messages])

  // Load chat history or start new conversation
  useEffect(() => {
    if (isOpen && !hasStarted) {
      const savedMessages = loadChat()
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages)
      } else {
        startConversation()
      }
      setHasStarted(true)
    }
  }, [isOpen, hasStarted])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const startConversation = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ai/chat-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      })

      if (!response.ok) throw new Error("Failed to start chat")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "",
      }
      setMessages([assistantMessage])

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = decoder.decode(value, { stream: true })
        assistantMessage.content += text
        setMessages([{ ...assistantMessage }])
      }
    } catch (_error) {
      // Fallback to default greeting
      setMessages([{
        id: Date.now().toString(),
        role: "assistant",
        content: "Hi! I'm here to help you with your medical request. What do you need today?\n\n[Medical Certificate] [Repeat Prescription] [GP Consult]",
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)
    setIsTyping(true)

    try {
      const response = await fetch("/api/ai/chat-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      }
      setMessages([...newMessages, assistantMessage])

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = decoder.decode(value, { stream: true })
        assistantMessage.content += text
        setMessages([...newMessages, { ...assistantMessage }])
      }

      // Check for intake_data JSON block
      const intakeDataMatch = assistantMessage.content.match(/```intake_data\s*([\s\S]*?)\s*```/)
      if (intakeDataMatch) {
        try {
          const intakeData = JSON.parse(intakeDataMatch[1])
          if (intakeData.ready && onComplete) {
            onComplete(intakeData.collected)
          }
        } catch {
          // Ignore parse errors
        }
      }
    } catch (_error) {
      // Show error message to user
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I had trouble processing that. Could you try again?",
      }])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleReset = () => {
    clearChat()
    setMessages([])
    setHasStarted(false)
    startConversation()
    setHasStarted(true)
  }

  return (
    <ChatContext.Provider value={{ sendMessage }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-20 right-4 z-50",
              "w-[380px] max-w-[calc(100vw-2rem)]",
              "bg-background border border-border rounded-2xl shadow-2xl",
              "flex flex-col overflow-hidden",
              "max-h-[600px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                <span className="font-semibold">InstantMed Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
              {messages.map((message, idx) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isLatest={idx === messages.length - 1}
                />
              ))}
              
              {isTyping && <TypingIndicator />}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 bg-background"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </ChatContext.Provider>
  )
}

export function ChatIntakeButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center",
          "hover:scale-105 active:scale-95",
          "transition-transform duration-200",
          isOpen && "hidden"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Chat window */}
      <ChatIntake 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onComplete={(data) => {
          // Navigate to appropriate intake page with collected data
          const serviceType = data.service_type as string
          if (serviceType === "med_cert") {
            window.location.href = "/medical-certificate/request"
          } else if (serviceType === "repeat_rx") {
            window.location.href = "/prescriptions/repeat"
          } else if (serviceType === "consult") {
            window.location.href = "/consult"
          }
          setIsOpen(false)
        }}
      />
    </>
  )
}
