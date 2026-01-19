"use client"

import { useState, useRef, useEffect, useCallback, useId, createContext, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Send, 
  X, 
  MessageCircle, 
  Stethoscope,
  RotateCcw,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ChatProgress } from "./chat-progress"
import { DoctorNotesPreview } from "./doctor-notes-preview"
import { DraftResume } from "./draft-resume"
import { MedicationSearchInline, isMedicationQuestion } from "./medication-search-inline"
import { SmartDateSuggestions } from "./smart-date-suggestions"
import { 
  DraftIntake, 
  loadDraft, 
  saveDraft, 
  clearDraft,
  generateDraftId,
} from "@/lib/intake/draft-intake"
import { 
  detectIntakeStep,
  generateSessionId,
  INTAKE_STEPS,
  type ServiceType,
} from "@/lib/intake/intake-analytics-types"
import { savePrefillData } from "@/lib/intake/form-prefill"

const CHAT_STORAGE_KEY = "instantmed_chat_history"
const CHAT_BUBBLE_DISMISSED_KEY = "instantmed_chat_bubble_dismissed"
const CHAT_EXPIRY_HOURS = 24
const STREAM_TIMEOUT_MS = 30000 // 30 second timeout for AI responses
const LONG_RESPONSE_THRESHOLD_MS = 5000 // Show "still thinking" after 5s

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  error?: boolean
  timestamp?: number
}

// Generate unique message ID
function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
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

function MessageBubble({ message, isLatest, isLoading, onRetry }: { 
  message: Message
  isLatest: boolean
  isLoading: boolean
  onRetry?: () => void
}) {
  const isUser = message.role === "user"
  const { cleanContent, quickReplies } = parseQuickReplies(message.content)
  const isError = message.error
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.25, 
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.2 }}
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
  const { sendMessage, refocusInput } = useChatContext()
  
  const handleClick = () => {
    sendMessage(reply.value)
    // Refocus input after selection
    setTimeout(() => refocusInput(), 50)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow key navigation between buttons
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = e.currentTarget.nextElementSibling as HTMLButtonElement
      next?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = e.currentTarget.previousElementSibling as HTMLButtonElement
      prev?.focus()
    }
  }
  
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
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
        "active:scale-95"
      )}
    >
      {reply.text}
    </motion.button>
  )
}

// Context for quick reply buttons to access sendMessage
const ChatContext = createContext<{ 
  sendMessage: (text: string) => void
  refocusInput: () => void 
}>({
  sendMessage: () => {},
  refocusInput: () => {},
})

function useChatContext() {
  return useContext(ChatContext)
}

// Typing indicator component (in message area)
function TypingIndicator({ showStillThinking = false }: { showStillThinking?: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex justify-start"
    >
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          {showStillThinking && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground ml-1"
            >
              Still thinking...
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Inline typing indicator for input field
function InputTypingIndicator() {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <motion.span
        className="w-1 h-1 bg-current rounded-full"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-1 h-1 bg-current rounded-full"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
      />
      <motion.span
        className="w-1 h-1 bg-current rounded-full"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
      />
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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [loadingDuration, setLoadingDuration] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  
  // New state for enhanced features
  const [_sessionId] = useState(() => generateSessionId())
  const [draftId] = useState(() => generateDraftId())
  const [serviceType, setServiceType] = useState<ServiceType>(null)
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({})
  const [showDraftResume, setShowDraftResume] = useState(false)
  const [savedDraft, setSavedDraft] = useState<DraftIntake | null>(null)
  const [showMedicationSearch, setShowMedicationSearch] = useState(false)
  const [showDateSuggestions, setShowDateSuggestions] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())

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

  // Load chat history or check for draft to resume
  useEffect(() => {
    if (isOpen && !hasStarted) {
      // Check for saved draft first
      const draft = loadDraft()
      if (draft && draft.messages.length >= 2) {
        setSavedDraft(draft)
        setShowDraftResume(true)
        setHasStarted(true)
        return
      }
      
      const savedMessages = loadChat()
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages)
        // Try to detect service type from saved messages
        detectServiceFromMessages(savedMessages)
      } else {
        startConversation()
      }
      setHasStarted(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasStarted])
  
  // Save draft periodically
  useEffect(() => {
    if (messages.length >= 2 && serviceType) {
      const stepInfo = detectIntakeStep(messages, serviceType, collectedData)
      saveDraft({
        id: draftId,
        serviceType,
        messages,
        collectedData,
        currentStep: stepInfo.stepNumber,
        totalSteps: stepInfo.totalSteps,
        createdAt: startTimeRef.current,
      })
    }
  }, [messages, serviceType, collectedData, draftId])
  
  // Detect service type and collected data from messages
  const detectServiceFromMessages = useCallback((msgs: Message[]) => {
    const allContent = msgs.map(m => m.content).join(' ')
    
    // Detect service type
    if (allContent.includes('Medical Certificate') || allContent.includes('med_cert')) {
      setServiceType('med_cert')
    } else if (allContent.includes('Repeat Prescription') || allContent.includes('repeat_rx')) {
      setServiceType('repeat_rx')
    } else if (allContent.includes('New Prescription') || allContent.includes('new_rx')) {
      setServiceType('new_rx')
    } else if (allContent.includes('GP Consult') || allContent.includes('consult')) {
      setServiceType('consult')
    }
    
    // Check if medication question is being asked
    const lastAssistant = msgs.filter(m => m.role === 'assistant').pop()
    if (lastAssistant && isMedicationQuestion(lastAssistant.content)) {
      setShowMedicationSearch(true)
    }
    
    // Check if date question is being asked
    if (lastAssistant && /start.*date|when.*start|from.*date/i.test(lastAssistant.content)) {
      setShowDateSuggestions(true)
    }
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])
  
  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
  
  // Track loading duration for "still thinking" message
  useEffect(() => {
    if (isLoading) {
      setLoadingDuration(0)
      loadingTimerRef.current = setInterval(() => {
        setLoadingDuration(d => d + 1000)
      }, 1000)
    } else {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
      setLoadingDuration(0)
    }
    
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current)
      }
    }
  }, [isLoading])
  
  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const startConversation = async () => {
    setIsLoading(true)
    setLastError(null)
    
    // Create abort controller for timeout
    abortControllerRef.current = new AbortController()
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), STREAM_TIMEOUT_MS)
    
    try {
      const response = await fetch("/api/ai/chat-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error("Failed to start chat")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
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
    } catch (error) {
      // Fallback to default greeting
      const isTimeout = error instanceof Error && error.name === 'AbortError'
      setMessages([{
        id: generateMessageId(),
        role: "assistant",
        content: isTimeout 
          ? "Sorry, I'm taking too long to respond. Let me try a simpler greeting.\n\nWhat do you need today?\n\n[Medical Certificate] [Repeat Prescription] [GP Consult]"
          : "Hi! I'm here to help with your medical request. What do you need today?\n\n[Medical Certificate] [Repeat Prescription] [GP Consult]",
        timestamp: Date.now(),
      }])
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }

  const sendMessage = async (text: string, isRetry = false) => {
    if (!text.trim() || isLoading) return
    
    setLastError(null)

    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    }

    // For retry, don't add a new user message
    const newMessages = isRetry ? messages : [...messages, userMessage]
    if (!isRetry) {
      setMessages(newMessages)
    }
    setInput("")
    setIsLoading(true)
    setIsTyping(true)
    
    // Create abort controller for timeout
    abortControllerRef.current = new AbortController()
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), STREAM_TIMEOUT_MS)

    try {
      const response = await fetch("/api/ai/chat-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter(m => !m.error).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error("Failed to send message")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
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

      // Check for intake_data JSON block and validate server-side before completion
      // More flexible regex to handle variations
      const intakeDataMatch = assistantMessage.content.match(/```(?:json)?\s*intake_data\s*([\s\S]*?)\s*```|```intake_data\s*([\s\S]*?)\s*```/)
      const jsonContent = intakeDataMatch?.[1] || intakeDataMatch?.[2]
      if (jsonContent) {
        try {
          const intakeData = JSON.parse(jsonContent)
          if ((intakeData.ready || intakeData.status === 'ready_for_review') && onComplete) {
            // CRITICAL: Validate server-side before allowing submission
            const validateRes = await fetch("/api/ai/chat-intake/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(intakeData),
            })
            
            if (validateRes.ok) {
              const validation = await validateRes.json()
              if (validation.valid && validation.data) {
                // Save prefill data for form transition
                savePrefillData({
                  service_type: intakeData.service_type,
                  ...intakeData.collected,
                })
                // Update collected data state
                setCollectedData(intakeData.collected || {})
                // Clear draft on successful completion
                clearDraft()
                onComplete({
                  ...validation.data,
                  service_type: intakeData.service_type,
                  _validated: true,
                })
              }
              // If validation failed, user can still continue chatting
            }
          }
        } catch {
          // Ignore parse errors - AI may not always produce valid JSON
        }
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError'
      const errorMessage = isTimeout 
        ? "Request timed out. Please try again."
        : "Sorry, I had trouble processing that."
      
      setLastError(text) // Store for retry
      
      // Show error message with retry option
      setMessages([...newMessages, {
        id: generateMessageId(),
        role: "assistant",
        content: errorMessage,
        error: true,
        timestamp: Date.now(),
      }])
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
      setIsTyping(false)
    }
  }
  
  const retryLastMessage = () => {
    if (lastError) {
      // Remove the error message
      setMessages(prev => prev.filter(m => !m.error))
      sendMessage(lastError, true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input)
    // Immediately refocus input after sending
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }
  
  const refocusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const handleReset = () => {
    clearChat()
    setMessages([])
    setHasStarted(false)
    startConversation()
    setHasStarted(true)
  }

  const chatId = useId()
  
  return (
    <ChatContext.Provider value={{ sendMessage, refocusInput }}>
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
            {/* Header with progress indicator */}
            <div className="border-b bg-primary text-primary-foreground">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  <span className="font-semibold">InstantMed Assistant</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    aria-label="Start new conversation"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label="Close chat"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {/* Progress indicator */}
              {serviceType && messages.length > 1 && (
                <div className="px-4 pb-2">
                  <ChatProgress
                    currentStep={detectIntakeStep(messages, serviceType, collectedData).stepNumber}
                    totalSteps={INTAKE_STEPS[serviceType]?.steps.length || 5}
                    labels={INTAKE_STEPS[serviceType]?.labels}
                  />
                </div>
              )}
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]"
              role="log"
              aria-live="polite"
              aria-label="Chat messages"
            >
              {/* Draft resume prompt */}
              {showDraftResume && savedDraft && (
                <DraftResume
                  draft={savedDraft}
                  onResume={(draft) => {
                    setMessages(draft.messages)
                    setServiceType(draft.serviceType as ServiceType)
                    setCollectedData(draft.collectedData)
                    setShowDraftResume(false)
                    clearDraft()
                  }}
                  onStartNew={() => {
                    setShowDraftResume(false)
                    setSavedDraft(null)
                    clearDraft()
                    startConversation()
                  }}
                />
              )}
              
              {!showDraftResume && messages.map((message, idx) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isLatest={idx === messages.length - 1}
                  isLoading={isLoading}
                  onRetry={message.error ? retryLastMessage : undefined}
                />
              ))}
              
              {/* Smart date suggestions */}
              {!isLoading && showDateSuggestions && (
                <SmartDateSuggestions
                  onSelect={(date) => {
                    sendMessage(date)
                    setShowDateSuggestions(false)
                  }}
                />
              )}
              
              {/* Medication search inline */}
              {!isLoading && showMedicationSearch && (
                <MedicationSearchInline
                  onSelect={(med) => {
                    sendMessage(`${med.drug_name} ${med.strength}`)
                    setShowMedicationSearch(false)
                  }}
                />
              )}
              
              {/* Doctor notes preview */}
              {serviceType && Object.keys(collectedData).length > 0 && !isLoading && (
                <DoctorNotesPreview
                  serviceType={serviceType}
                  collectedData={collectedData}
                />
              )}
              
              <AnimatePresence>
                {isTyping && (
                  <TypingIndicator 
                    showStillThinking={loadingDuration >= LONG_RESPONSE_THRESHOLD_MS} 
                  />
                )}
              </AnimatePresence>
              
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t bg-muted/30">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    id={`${chatId}-input`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isLoading ? "" : "Type your message..."}
                    disabled={isLoading}
                    aria-label="Chat message input"
                    aria-describedby={isLoading ? `${chatId}-loading` : undefined}
                    className={cn(
                      "flex-1 bg-background pr-8 transition-all",
                      isLoading && "text-transparent"
                    )}
                  />
                  {/* Inline typing indicator */}
                  {isLoading && (
                    <div 
                      id={`${chatId}-loading`}
                      className="absolute inset-y-0 left-3 flex items-center"
                      aria-label="Assistant is typing"
                    >
                      <InputTypingIndicator />
                    </div>
                  )}
                </div>
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                  className="shrink-0"
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

// Floating bubble prompt messages (rotates)
const BUBBLE_PROMPTS = [
  "Need a hand?",
  "Quick question?",
  "How can I help?",
]

// Load bubble dismissed state from localStorage
function loadBubbleDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(CHAT_BUBBLE_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

// Save bubble dismissed state to localStorage
function saveBubbleDismissed(dismissed: boolean) {
  if (typeof window === "undefined") return
  try {
    if (dismissed) {
      localStorage.setItem(CHAT_BUBBLE_DISMISSED_KEY, 'true')
    } else {
      localStorage.removeItem(CHAT_BUBBLE_DISMISSED_KEY)
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function ChatIntakeButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const [bubbleIndex, setBubbleIndex] = useState(0)
  const [bubbleDismissed, setBubbleDismissed] = useState(loadBubbleDismissed)
  
  // Show bubble after 3 seconds on page, hide after interaction or 10 seconds
  useEffect(() => {
    // Don't show if user has dismissed or chat is open
    if (bubbleDismissed || isOpen) return
    
    const showTimer = setTimeout(() => {
      setShowBubble(true)
    }, 3000)
    
    const hideTimer = setTimeout(() => {
      setShowBubble(false)
    }, 13000) // 3s delay + 10s visible
    
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [bubbleDismissed, isOpen])
  
  // Rotate bubble text every 5 seconds while visible
  useEffect(() => {
    if (!showBubble) return
    
    const interval = setInterval(() => {
      setBubbleIndex((i) => (i + 1) % BUBBLE_PROMPTS.length)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [showBubble])
  
  const handleBubbleClick = () => {
    setShowBubble(false)
    setBubbleDismissed(true)
    saveBubbleDismissed(true)
    setIsOpen(true)
  }
  
  const handleBubbleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowBubble(false)
    setBubbleDismissed(true)
    saveBubbleDismissed(true)
  }

  return (
    <>
      {/* Floating bubble prompt */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-20 right-4 z-50",
              "bg-background border border-border rounded-2xl shadow-lg",
              "px-4 py-3 max-w-[200px]",
              "cursor-pointer group"
            )}
            onClick={handleBubbleClick}
            role="button"
            tabIndex={0}
            aria-label="Open chat assistant"
            onKeyDown={(e) => e.key === 'Enter' && handleBubbleClick()}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <motion.p 
                  key={bubbleIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium"
                >
                  {BUBBLE_PROMPTS[bubbleIndex]}
                </motion.p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chat with our assistant
                </p>
              </div>
              <button
                onClick={handleBubbleDismiss}
                className="text-muted-foreground hover:text-foreground p-0.5 -mr-1 -mt-1"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Tail pointing to button */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-background border-b border-r border-border rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating button */}
      <motion.button
        onClick={() => {
          setShowBubble(false)
          setBubbleDismissed(true)
          setIsOpen(true)
        }}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center",
          "hover:shadow-xl",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "transition-shadow duration-200",
          isOpen && "hidden"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open chat assistant"
      >
        <MessageCircle className="w-6 h-6" />
        {/* Subtle pulse indicator when bubble is showing */}
        {showBubble && (
          <motion.span
            className="absolute inset-0 rounded-full bg-primary"
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Chat window */}
      <ChatIntake 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onComplete={(data) => {
          // Navigate to appropriate intake page with collected data as query params
          const serviceType = data.service_type as string
          // Encode collected data as base64 to preserve structure
          const encodedData = btoa(JSON.stringify(data))
          const prefillParam = `?prefill=${encodeURIComponent(encodedData)}`
          
          if (serviceType === "med_cert") {
            window.location.href = `/medical-certificate/request${prefillParam}`
          } else if (serviceType === "repeat_rx") {
            window.location.href = `/prescriptions/repeat${prefillParam}`
          } else if (serviceType === "consult") {
            window.location.href = `/consult${prefillParam}`
          }
          setIsOpen(false)
        }}
      />
    </>
  )
}
