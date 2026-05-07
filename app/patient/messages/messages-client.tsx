"use client"

import {
  ArrowLeft,
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
  error,
}: MessagesClientProps) {
  const router = useRouter()
  const [selectedIntake, setSelectedIntake] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [failedMessage, setFailedMessage] = useState<{ intakeId: string; content: string } | null>(null)
  const [replyReceived, setReplyReceived] = useState<string | null>(null)
  const [retrySent, setRetrySent] = useState<string | null>(null)

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

  const sendPatientMessage = async ({
    intakeId,
    content,
    retry = false,
  }: {
    intakeId: string
    content: string
    retry?: boolean
  }) => {
    if (!content.trim()) return

    setSending(true)
    try {
      const response = await fetchWithCsrf("/api/patient/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeId,
          content: content.trim(),
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        message?: { restored_status?: string | null } | null
      } | null

      if (!response.ok) throw new Error("Failed to send message")

      const restoredStatus = data?.message?.restored_status
      setFailedMessage(null)
      setReplyReceived(restoredStatus ? intakeId : null)
      setRetrySent(retry ? intakeId : null)
      setNewMessage("")
      toast.success(retry ? "Retry sent" : restoredStatus ? "Reply received" : "Message sent")
      router.refresh()
    } catch {
      setFailedMessage({ intakeId, content: content.trim() })
      setRetrySent(null)
      toast.error("Reply not sent")
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedIntake) return
    await sendPatientMessage({ intakeId: selectedIntake, content: newMessage })
  }

  const retryFailedMessage = async () => {
    if (!failedMessage) return
    await sendPatientMessage({
      intakeId: failedMessage.intakeId,
      content: failedMessage.content,
      retry: true,
    })
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
              <div
                role="listbox"
                aria-label="Conversations"
                className={cn("space-y-2", selectedIntake && "hidden md:block")}
              >
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
              <div className={cn("md:col-span-2", !selectedIntake && "hidden md:block")}>
                {selectedIntake ? (
                  <div className="space-y-3 md:space-y-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 gap-1.5 md:hidden"
                      onClick={() => setSelectedIntake(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Conversations
                    </Button>
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
                      <div className="space-y-3">
                        {replyReceived === selectedIntake && (
                          <div role="status" className="rounded-lg border border-success-border bg-success-light/30 px-3 py-2 text-xs text-success">
                            <span className="font-medium">Reply received.</span>{" "}
                            Your request is back with the doctor.
                          </div>
                        )}
                        {retrySent === selectedIntake && (
                          <div role="status" className="rounded-lg border border-success-border bg-success-light/30 px-3 py-2 text-xs text-success">
                            Retry sent.
                          </div>
                        )}
                        {failedMessage?.intakeId === selectedIntake && (
                          <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive-border bg-destructive-light/30 px-3 py-2 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between">
                            <span>
                              <span className="font-medium">Reply not sent.</span>{" "}
                              Your message is still here.
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={retryFailedMessage}
                              disabled={sending}
                              className="h-8 border-destructive/30 text-destructive hover:text-destructive"
                            >
                              Try again
                            </Button>
                          </div>
                        )}
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
                      </div>
                    </Card>
                  </div>
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
