"use client"

import { createContext, useContext, useState, useRef, useEffect, useCallback, useId } from "react"
import {
  DraftIntake,
  loadDraft,
  saveDraft,
  clearDraft,
  generateDraftId,
} from "@/lib/chat/draft-intake"
import {
  detectIntakeStep,
  generateSessionId,
  INTAKE_STEPS,
  type ServiceType,
} from "@/lib/chat/intake-analytics-types"
import { savePrefillData } from "@/lib/chat/form-prefill"
import { isMedicationQuestion } from "./medication-search-inline"

const CHAT_STORAGE_KEY = "instantmed_chat_history"
const CHAT_EXPIRY_HOURS = 24
const STREAM_TIMEOUT_MS = 30000
const LONG_RESPONSE_THRESHOLD_MS = 5000

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  error?: boolean
  timestamp?: number
}

export interface QuickReply {
  text: string
  value: string
}

interface StoredChat {
  messages: Message[]
  timestamp: number
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
}

export function parseQuickReplies(content: string): { cleanContent: string; quickReplies: QuickReply[] } {
  const quickReplies: QuickReply[] = []
  const buttonRegex = /\[([^\]]+)\]/g
  let match
  while ((match = buttonRegex.exec(content)) !== null) {
    quickReplies.push({ text: match[1], value: match[1] })
  }
  const cleanContent = content.replace(/\[([^\]]+)\]\s*/g, "").trim()
  return { cleanContent, quickReplies }
}

// localStorage helpers
function saveChat(messages: Message[]) {
  if (typeof window === "undefined") return
  const data: StoredChat = { messages, timestamp: Date.now() }
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data))
}

function loadChat(): Message[] | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!stored) return null
    const data: StoredChat = JSON.parse(stored)
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

function clearChat() {
  if (typeof window === "undefined") return
  localStorage.removeItem(CHAT_STORAGE_KEY)
}

export { LONG_RESPONSE_THRESHOLD_MS }

// --- Context ---

interface ChatIntakeContextValue {
  messages: Message[]
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  isTyping: boolean
  loadingDuration: number
  sessionId: string
  serviceType: ServiceType
  collectedData: Record<string, unknown>
  showDraftResume: boolean
  savedDraft: DraftIntake | null
  showMedicationSearch: boolean
  setShowMedicationSearch: (value: boolean) => void
  showDateSuggestions: boolean
  setShowDateSuggestions: (value: boolean) => void
  isRedirecting: boolean
  hasStarted: boolean
  lastError: string | null

  sendMessage: (text: string, isRetry?: boolean) => void
  retryLastMessage: () => void
  handleSubmit: (e: React.FormEvent) => void
  handleReset: () => void
  refocusInput: () => void
  resumeDraft: (draft: DraftIntake) => void
  startNewFromDraft: () => void
  scrollToBottom: () => void

  messagesEndRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLInputElement | null>
  chatId: string

  // Progress helpers
  currentStep: number
  totalSteps: number
  stepLabels: string[] | undefined
}

const ChatIntakeContext = createContext<ChatIntakeContextValue | null>(null)

export function useChatIntakeContext() {
  const ctx = useContext(ChatIntakeContext)
  if (!ctx) {
    throw new Error("useChatIntakeContext must be used within ChatIntakeProvider")
  }
  return ctx
}

interface ChatIntakeProviderProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: (data: Record<string, unknown>) => void
  children: React.ReactNode
}

export function ChatIntakeProvider({ isOpen, onClose, onComplete, children }: ChatIntakeProviderProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [loadingDuration, setLoadingDuration] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)

  const [sessionId] = useState(() => generateSessionId())
  const [draftId] = useState(() => generateDraftId())
  const [serviceType, setServiceType] = useState<ServiceType>(null)
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({})
  const [showDraftResume, setShowDraftResume] = useState(false)
  const [savedDraft, setSavedDraft] = useState<DraftIntake | null>(null)
  const [showMedicationSearch, setShowMedicationSearch] = useState(false)
  const [showDateSuggestions, setShowDateSuggestions] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  const chatId = useId()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      saveChat(messages)
    }
  }, [messages])

  // Load chat history or check for draft to resume
  useEffect(() => {
    if (isOpen && !hasStarted) {
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

  const detectServiceFromMessages = useCallback((msgs: Message[]) => {
    const allContent = msgs.map((m) => m.content).join(" ")

    if (allContent.includes("Medical Certificate") || allContent.includes("med_cert")) {
      setServiceType("med_cert")
    } else if (allContent.includes("Repeat Prescription") || allContent.includes("repeat_rx")) {
      setServiceType("repeat_rx")
    } else if (allContent.includes("New Prescription") || allContent.includes("new_rx")) {
      setServiceType("new_rx")
    } else if (allContent.includes("GP Consult") || allContent.includes("consult")) {
      setServiceType("consult")
    }

    const lastAssistant = msgs.filter((m) => m.role === "assistant").pop()
    if (lastAssistant && isMedicationQuestion(lastAssistant.content)) {
      setShowMedicationSearch(true)
    }
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
      if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Track loading duration
  useEffect(() => {
    if (isLoading) {
      setLoadingDuration(0)
      loadingTimerRef.current = setInterval(() => {
        setLoadingDuration((d) => d + 1000)
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

    abortControllerRef.current = new AbortController()
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), STREAM_TIMEOUT_MS)

    try {
      const response = await fetch("/api/ai/chat-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
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
      const isTimeout = error instanceof Error && error.name === "AbortError"
      setMessages([
        {
          id: generateMessageId(),
          role: "assistant",
          content: isTimeout
            ? 'Sorry, I\'m taking too long to respond. Let me try a simpler greeting.\n\nWhat do you need today?\n\n[Medical Certificate] [Repeat Prescription] [GP Consult]'
            : "Hi! I'm here to help with your medical request. What do you need today?\n\n[Medical Certificate] [Repeat Prescription] [GP Consult]",
          timestamp: Date.now(),
        },
      ])
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

    const newMessages = isRetry ? messages : [...messages, userMessage]
    if (!isRetry) {
      setMessages(newMessages)
    }
    setInput("")
    setIsLoading(true)
    setIsTyping(true)

    abortControllerRef.current = new AbortController()
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), STREAM_TIMEOUT_MS)

    try {
      const response = await fetch("/api/ai/chat-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          messages: newMessages
            .filter((m) => !m.error)
            .map((m) => ({
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

      // Check for intake_data JSON block
      const intakeDataMatch = assistantMessage.content.match(
        /```(?:json)?\s*intake_data\s*([\s\S]*?)\s*```|```intake_data\s*([\s\S]*?)\s*```/
      )
      const jsonContent = intakeDataMatch?.[1] || intakeDataMatch?.[2]
      if (jsonContent) {
        try {
          const intakeData = JSON.parse(jsonContent)
          const isReady = intakeData.ready || intakeData.status === "ready_for_review"
          if (isReady) {
            const validateRes = await fetch("/api/ai/chat-intake/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(intakeData),
            })

            if (validateRes.ok) {
              const validation = await validateRes.json()
              if (validation.valid && validation.data) {
                savePrefillData(
                  {
                    service_type: intakeData.service_type,
                    ...intakeData.collected,
                  },
                  sessionId
                )
                setCollectedData(intakeData.collected || {})
                clearDraft()

                if (onComplete) {
                  onComplete({
                    ...validation.data,
                    service_type: intakeData.service_type,
                    chatSessionId: sessionId,
                    _validated: true,
                  })
                } else {
                  setIsRedirecting(true)
                  const serviceSlugMap: Record<string, string> = {
                    med_cert: "med-cert",
                    medical_certificate: "med-cert",
                    repeat_rx: "repeat-script",
                    repeat_prescription: "repeat-script",
                    new_rx: "prescription",
                    new_prescription: "prescription",
                    consult: "consult",
                    general_consult: "consult",
                  }
                  const serviceSlug = serviceSlugMap[intakeData.service_type] || "med-cert"
                  setTimeout(() => {
                    window.location.href = `/request/${serviceSlug}?prefill=true&from=chat`
                  }, 300)
                }
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError"
      const errorMessage = isTimeout
        ? "Request timed out. Please try again."
        : "Sorry, I had trouble processing that."

      setLastError(text)

      setMessages([
        ...newMessages,
        {
          id: generateMessageId(),
          role: "assistant",
          content: errorMessage,
          error: true,
          timestamp: Date.now(),
        },
      ])
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const retryLastMessage = () => {
    if (lastError) {
      setMessages((prev) => prev.filter((m) => !m.error))
      sendMessage(lastError, true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input)
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

  const resumeDraft = (draft: DraftIntake) => {
    setMessages(draft.messages)
    setServiceType(draft.serviceType as ServiceType)
    setCollectedData(draft.collectedData)
    setShowDraftResume(false)
    clearDraft()
  }

  const startNewFromDraft = () => {
    setShowDraftResume(false)
    setSavedDraft(null)
    clearDraft()
    startConversation()
  }

  // Progress helpers
  const stepInfo = serviceType && messages.length > 1
    ? detectIntakeStep(messages, serviceType, collectedData)
    : null
  const currentStep = stepInfo?.stepNumber ?? 0
  const totalSteps = serviceType ? (INTAKE_STEPS[serviceType]?.steps.length || 5) : 5
  const stepLabels = serviceType ? INTAKE_STEPS[serviceType]?.labels : undefined

  const value: ChatIntakeContextValue = {
    messages,
    input,
    setInput,
    isLoading,
    isTyping,
    loadingDuration,
    sessionId,
    serviceType,
    collectedData,
    showDraftResume,
    savedDraft,
    showMedicationSearch,
    setShowMedicationSearch,
    showDateSuggestions,
    setShowDateSuggestions,
    isRedirecting,
    hasStarted,
    lastError,
    sendMessage,
    retryLastMessage,
    handleSubmit,
    handleReset,
    refocusInput,
    resumeDraft,
    startNewFromDraft,
    scrollToBottom,
    messagesEndRef,
    inputRef,
    chatId,
    currentStep,
    totalSteps,
    stepLabels,
  }

  return <ChatIntakeContext.Provider value={value}>{children}</ChatIntakeContext.Provider>
}
