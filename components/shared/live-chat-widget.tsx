"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

const quickReplies = [
  "How long does a request take?",
  "What are your fees?",
  "I need help with my request",
  "How do prescriptions work?",
]

const botResponses: Record<string, string> = {
  "how long does a request take?":
    "Most requests are reviewed within 24 hours, often much faster! Med certs and scripts typically get processed within a few hours during business hours.",
  "what are your fees?":
    "Our fees are: Medical Certificates $24.95, Repeat Prescriptions $19.95, Specialist Referrals $29.95. Check our pricing page for more details!",
  "i need help with my request":
    "I'd be happy to help! Could you tell me your request ID or describe the issue? You can also email support@instantmed.com.au for detailed assistance.",
  "how do prescriptions work?":
    "Once approved, your prescription is sent as an electronic script (eScript) via SMS and email. You can take it to any pharmacy in Australia to have it dispensed.",
  default:
    "Thanks for your message! For detailed inquiries, please email support@instantmed.com.au or call 1300 123 456. Our team typically responds within a few hours.",
}

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm the InstantMed assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")

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

    // Simulate bot response
    setTimeout(() => {
      const lowerText = text.toLowerCase().trim()
      const response = botResponses[lowerText] || botResponses.default

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    }, 800)
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00E2B5] to-[#00C9A0] text-[#0A0F1C] shadow-lg transition-all hover:scale-105 hover:shadow-xl",
          isOpen && "scale-0 opacity-0",
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] rounded-2xl bg-white shadow-2xl transition-all duration-300 border border-[#0A0F1C]/10 overflow-hidden",
          isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#00E2B5] to-[#00C9A0] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-5 w-5 text-[#0A0F1C]" />
            </div>
            <div>
              <p className="font-semibold text-[#0A0F1C]">InstantMed Assistant</p>
              <p className="text-xs text-[#0A0F1C]/70">Typically replies instantly</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="rounded-full p-1.5 hover:bg-white/20 transition-colors">
            <X className="h-5 w-5 text-[#0A0F1C]" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-[320px] overflow-y-auto p-4 space-y-4 bg-[#fafbfc]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-2", message.sender === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  message.sender === "user" ? "bg-[#0A0F1C]" : "bg-gradient-to-br from-[#00E2B5] to-[#00C9A0]",
                )}
              >
                {message.sender === "user" ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-[#0A0F1C]" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[240px] rounded-2xl px-4 py-2.5 text-sm",
                  message.sender === "user"
                    ? "bg-[#0A0F1C] text-white rounded-tr-sm"
                    : "bg-white text-[#0A0F1C] shadow-sm border border-[#0A0F1C]/5 rounded-tl-sm",
                )}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2 bg-[#fafbfc]">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                className="rounded-full bg-white border border-[#0A0F1C]/10 px-3 py-1.5 text-xs font-medium text-[#0A0F1C] hover:bg-[#00E2B5]/10 hover:border-[#00E2B5]/30 transition-all"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-[#0A0F1C]/5 bg-white p-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-[#0A0F1C]/10 bg-[#fafbfc] focus:border-[#00E2B5] focus:ring-[#00E2B5]/20"
          />
          <Button
            size="icon"
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00E2B5] to-[#00C9A0] text-[#0A0F1C] hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
