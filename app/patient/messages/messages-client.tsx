"use client"

import {
  CheckCheck,
  Clock,
  Inbox,
  MessageSquare,
  Send,
  Stethoscope,
  User,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { DashboardPageHeader } from "@/components/dashboard"
import { PatientErrorAlert } from "@/components/patient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import { fetchWithCsrf } from "@/lib/security/csrf-client"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  intake_id: string | null
  sender_type: "patient" | "doctor" | "system"
  sender_id: string | null
  content: string
  read_at: string | null
  created_at: string
  intake?: {
    id: string
    category?: string | null
    service?: { name: string; short_name: string } | null
  } | null
}

interface MessagesClientProps {
  messages: Message[]
  messagesByIntake: Record<string, Message[]>
  unreadCount: number
  initialSelectedIntakeId?: string | null
  error?: string | null
}

function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    med_certs: "Medical Certificate",
    repeat_rx: "Repeat Prescription",
    consults: "Consultation",
  }
  return labels[type] || type
}

export function MessagesClient({
  messages,
  messagesByIntake,
  unreadCount,
  initialSelectedIntakeId,
  error,
}: MessagesClientProps) {
  const router = useRouter()
  const [selectedIntake, setSelectedIntake] = useState<string | null>(() => (
    initialSelectedIntakeId && messagesByIntake[initialSelectedIntakeId]
      ? initialSelectedIntakeId
      : null
  ))
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)

  const conversations = Object.entries(messagesByIntake).map(([intakeId, msgs]) => {
    const lastMessage = msgs[0]
    const unread = msgs.filter((m) => m.sender_type === "doctor" && !m.read_at).length
    return {
      intakeId,
      lastMessage,
      unread,
      serviceName: lastMessage?.intake?.service?.name ||
                   lastMessage?.intake?.service?.short_name ||
                   formatServiceType(lastMessage?.intake?.category || ""),
    }
  })

  const selectedMessages = selectedIntake ? messagesByIntake[selectedIntake] || [] : []

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedIntake) return

    setSending(true)
    try {
      const response = await fetchWithCsrf("/api/patient/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeId: selectedIntake,
          content: newMessage.trim(),
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      toast.success("Message sent")
      setNewMessage("")
      // Refresh to show the new message immediately
      router.refresh()
    } catch {
      toast.error("Failed to send message. Please try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
          <DashboardPageHeader
            title="Messages"
            description="Communicate with your doctor about your requests"
            badge={
              unreadCount > 0 ? (
                <Badge className="bg-primary">{unreadCount} unread</Badge>
              ) : undefined
            }
          />

          {/* Error State */}
          {error && <PatientErrorAlert error={error} className="mb-6" />}

          {messages.length === 0 && !error ? (
            <EmptyState
              icon={Inbox}
              title="No messages yet"
              description="If a doctor needs more information about your request, they'll message you here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Conversation List */}
              <div role="listbox" aria-label="Conversations" className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Conversations</p>
                {conversations.map((conv) => (
                  <button
                    key={conv.intakeId}
                    role="option"
                    aria-selected={selectedIntake === conv.intakeId}
                    onClick={() => setSelectedIntake(conv.intakeId)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-colors",
                      selectedIntake === conv.intakeId
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-card hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{conv.serviceName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage?.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {conv.lastMessage?.created_at ? formatDate(conv.lastMessage.created_at) : ""}
                        </p>
                      </div>
                      {conv.unread > 0 && (
                        <Badge className="ml-2 bg-primary shrink-0">{conv.unread}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Message Thread */}
              <div className="md:col-span-2">
                {selectedIntake ? (
                  <Card className="h-[calc(100vh-16rem)] min-h-[300px] max-h-[600px] flex flex-col">
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                      {selectedMessages
                        .slice()
                        .reverse()
                        .map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex gap-3",
                              msg.sender_type === "patient" ? "flex-row-reverse" : ""
                            )}
                          >
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                msg.sender_type === "patient"
                                  ? "bg-primary/10"
                                  : msg.sender_type === "doctor"
                                  ? "bg-success-light/40"
                                  : "bg-muted"
                              )}
                            >
                              {msg.sender_type === "patient" ? (
                                <User className="w-4 h-4 text-primary" />
                              ) : msg.sender_type === "doctor" ? (
                                <Stethoscope className="w-4 h-4 text-success" />
                              ) : (
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div
                              className={cn(
                                "max-w-[80%] rounded-xl p-3",
                                msg.sender_type === "patient"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              )}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <div
                                className={cn(
                                  "flex items-center gap-1 mt-1 text-xs",
                                  msg.sender_type === "patient"
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                )}
                              >
                                <Clock className="w-3 h-3" />
                                {new Date(msg.created_at).toLocaleTimeString("en-AU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {msg.sender_type === "patient" && msg.read_at && (
                                  <CheckCheck className="w-3 h-3 ml-1" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                    <div className="border-t p-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="min-h-[60px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sending}
                          className="shrink-0"
                          aria-label="Send message"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="h-[calc(100vh-16rem)] min-h-[300px] max-h-[600px] flex items-center justify-center">
                    <CardContent className="text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Select a conversation to view messages</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
      </div>
  )
}
