"use client"

import { MessageSquare, Stethoscope, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PatientThreadMessage } from "@/lib/data/patient-messages"
import { cn } from "@/lib/utils"

interface PatientMessageThreadProps {
  messages: PatientThreadMessage[]
  infoRequestMessage?: string | null
  infoRequestedAt?: string | null
  status?: string | null
}

function formatMessageTime(value: string | null | undefined) {
  if (!value) return null
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  })
}

function senderLabel(senderType: PatientThreadMessage["sender_type"]) {
  if (senderType === "patient") return "Patient"
  if (senderType === "doctor") return "Doctor"
  return "System"
}

export function PatientMessageThread({
  messages,
  infoRequestMessage,
  infoRequestedAt,
  status,
}: PatientMessageThreadProps) {
  if (messages.length === 0 && !infoRequestMessage) return null

  const patientReplies = messages.filter((message) => message.sender_type === "patient").length
  const waitingForPatient = status === "pending_info" && patientReplies === 0

  return (
    <Card>
      <CardHeader className="px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" />
          Patient messages
          {waitingForPatient ? (
            <Badge variant="outline" className="ml-auto text-amber-700 border-amber-300">
              Waiting for patient
            </Badge>
          ) : patientReplies > 0 ? (
            <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300">
              Patient replied
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        {infoRequestMessage && messages.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium">Last information request</span>
              {infoRequestedAt && (
                <span className="text-xs text-amber-800">{formatMessageTime(infoRequestedAt)}</span>
              )}
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{infoRequestMessage}</p>
          </div>
        )}

        {messages.map((message) => {
          const isPatient = message.sender_type === "patient"
          const isDoctor = message.sender_type === "doctor"

          return (
            <div
              key={message.id}
              className={cn(
                "rounded-lg border p-3 text-sm",
                isPatient
                  ? "border-emerald-200 bg-emerald-50"
                  : isDoctor
                    ? "border-blue-200 bg-blue-50"
                    : "border-border bg-muted/40",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  {isPatient ? (
                    <UserRound className="h-3.5 w-3.5" />
                  ) : isDoctor ? (
                    <Stethoscope className="h-3.5 w-3.5" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                  )}
                  {senderLabel(message.sender_type)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
