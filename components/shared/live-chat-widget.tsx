"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

const smartResponses: Record<string, { match: RegExp; response: string }[]> = {
  timing: [
    {
      match: /how long|wait|time|fast/i,
      response:
        "Most requests are reviewed within 1-2 hours during business hours (8am-10pm AEST). You'll get an email as soon as it's done!",
    },
  ],
  pricing: [
    {
      match: /price|cost|fee|how much|pay/i,
      response:
        "Med certs are $19.95 and scripts are $24.95. If we can't help you, you get a full refund — no questions asked.",
    },
  ],
  status: [
    {
      match: /status|my request|where|track/i,
      response:
        "You can check your request status anytime in your dashboard at /patient. I can also look it up if you share your request ID!",
    },
  ],
  prescription: [
    {
      match: /script|prescription|medication|medicine|pill/i,
      response:
        "We can help with repeat prescriptions for stable conditions. Once approved, you'll get an eScript via SMS that works at any Aussie pharmacy. Note: we can't prescribe controlled substances.",
    },
  ],
  medcert: [
    {
      match: /med cert|medical certificate|sick|unwell|work/i,
      response:
        "Our med certs are accepted by all employers and universities. A GP reviews your symptoms and issues the certificate if appropriate — usually within a couple of hours.",
    },
  ],
  refund: [
    {
      match: /refund|money back|cancel/i,
      response:
        "If we can't help with your request for any clinical reason, you get a full refund automatically. No forms, no hassle.",
    },
  ],
  legitimate: [
    {
      match: /legit|real|scam|legal|safe/i,
      response:
        "100% legit! All our doctors are AHPRA-registered Australian GPs. You can verify their credentials on the public AHPRA register. We're compliant with all Australian telehealth regulations.",
    },
  ],
}

function getSmartResponse(text: string): string {
  const lowerText = text.toLowerCase()

  for (const category of Object.values(smartResponses)) {
    for (const { match, response } of category) {
      if (match.test(lowerText)) {
        return response
      }
    }
  }

  return "Thanks for your message! For detailed inquiries, email support@instantmed.com.au or call 1300 123 456. A human will get back to you within a few hours."
}

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [showProactive, setShowProactive] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm the InstantMed assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Proactive trigger after 30 seconds on page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowProactive(true)
    }, 30000)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Smart response with delay
    setTimeout(() => {
      const response = getSmartResponse(text)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    }, 600)
  }

  const quickReplies = ["How long does it take?", "What are your fees?", "Track my request", "Is this legitimate?"]

  return (
    <>
      {/* Proactive prompt */}
      {showProactive && !isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 max-w-[280px] rounded-2xl bg-white p-4 shadow-xl border animate-fade-in-up"
          role="alert"
        >
          <button
            onClick={() => setShowProactive(false)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Need help?</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Stuck or have questions? I can help you get started.</p>
          <Button
            size="sm"
            onClick={() => {
              setIsOpen(true)
              setShowProactive(false)
            }}
            className="w-full rounded-full"
          >
            Chat with us
          </Button>
        </div>
      )}

      {/* Chat Button */}
      <button
        onClick={() => {
          setIsOpen(true)
          setShowProactive(false)
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl",
          isOpen && "scale-0 opacity-0",
        )}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] rounded-2xl bg-background shadow-2xl transition-all duration-300 border overflow-hidden",
          isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none",
        )}
        role="dialog"
        aria-label="Chat window"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-primary-foreground">InstantMed</p>
              <p className="text-xs text-primary-foreground/70">Usually replies instantly</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1.5 hover:bg-primary-foreground/20 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-[320px] overflow-y-auto p-4 space-y-4 bg-muted/30">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-2", message.sender === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  message.sender === "user" ? "bg-foreground" : "bg-primary",
                )}
              >
                {message.sender === "user" ? (
                  <User className="h-4 w-4 text-background" />
                ) : (
                  <Bot className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[240px] rounded-2xl px-4 py-2.5 text-sm",
                  message.sender === "user"
                    ? "bg-foreground text-background rounded-tr-sm"
                    : "bg-card text-foreground shadow-sm border rounded-tl-sm",
                )}
              >
                {message.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2 bg-muted/30">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                className="rounded-full bg-card border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-all"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 border-t bg-card p-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-border bg-muted/50 focus:border-primary"
          />
          <Button
            size="icon"
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="h-10 w-10 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
