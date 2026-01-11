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
        "Most requests are done within 1-2 hours (8am-10pm AEST). We'll email you the second it's ready.",
    },
  ],
  pricing: [
    {
      match: /price|cost|fee|how much|pay/i,
      response:
        "Med certs are $19.95, scripts are $29.95. If we can't help, full refund. No forms, no drama.",
    },
  ],
  status: [
    {
      match: /status|my request|where|track/i,
      response:
        "Check your request anytime at /patient. Or share your request ID and I'll dig it up.",
    },
  ],
  prescription: [
    {
      match: /script|prescription|medication|medicine|pill/i,
      response:
        "We do repeat scripts for stable conditions. Once approved, you get an eScript via SMS — works at any pharmacy. Heads up: we can't do controlled substances.",
    },
  ],
  medcert: [
    {
      match: /med cert|medical certificate|sick|unwell|work/i,
      response:
        "Med certs accepted everywhere — work, uni, TAFE. A GP reviews your symptoms and issues the cert if it checks out. Usually a couple of hours.",
    },
  ],
  refund: [
    {
      match: /refund|money back|cancel/i,
      response:
        "If we can't help for any clinical reason, automatic refund. No chasing, no paperwork.",
    },
  ],
  legitimate: [
    {
      match: /legit|real|scam|legal|safe/i,
      response:
        "Totally legit. All our doctors are AHPRA-registered Australian GPs — you can look them up on the public register. We follow all telehealth regulations.",
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

  return "Good question — I'm not sure on that one. Email hello@instantmed.com.au and a real human will help."
}

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [showProactive, setShowProactive] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hey! Got a question? I can help with the basics, or point you to a human.",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageIdRef = useRef(1)

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

    const nextId = String(messageIdRef.current++)

    const userMessage: Message = {
      id: nextId,
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Smart response with delay
    setTimeout(() => {
      const response = getSmartResponse(text)
      const botId = String(messageIdRef.current++)
      const botMessage: Message = {
        id: botId,
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
              <p className="font-semibold text-primary-foreground">Lumen Health</p>
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
        <div className="h-80 overflow-y-auto p-4 space-y-4 bg-muted/30">
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
                  "max-w-60 rounded-2xl px-4 py-2.5 text-sm",
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
