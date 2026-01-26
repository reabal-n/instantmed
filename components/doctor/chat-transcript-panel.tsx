"use client"

/**
 * Chat Transcript Panel
 * 
 * Displays the full AI chat conversation for doctor review.
 * Collapsed by default to avoid cognitive anchoring.
 */

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  MessageSquare,
  ChevronDown,
  User,
  Bot,
  AlertTriangle,
  Loader2,
  Clock,
} from "lucide-react"
import { getChatTranscriptForIntake, type GetTranscriptResult } from "@/app/actions/get-chat-transcript"

interface ChatTranscriptPanelProps {
  intakeId: string
}

export function ChatTranscriptPanel({ intakeId }: ChatTranscriptPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isExpanded, setIsExpanded] = useState(false)
  const [transcript, setTranscript] = useState<GetTranscriptResult["transcript"] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Load transcript when expanded for the first time
  useEffect(() => {
    if (isExpanded && !loaded && !isPending) {
      startTransition(async () => {
        const result = await getChatTranscriptForIntake(intakeId)
        if (result.success) {
          setTranscript(result.transcript || null)
        } else {
          setError(result.error || "Failed to load transcript")
        }
        setLoaded(true)
      })
    }
  }, [isExpanded, loaded, isPending, intakeId])

  // Don't render if we've loaded and there's no transcript
  if (loaded && !transcript && !error) {
    return null
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={!isExpanded ? "border-slate-200 bg-slate-50/30" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <CardTitle className="flex items-center gap-2 text-base cursor-pointer">
                  <MessageSquare className="h-5 w-5 text-slate-500" />
                  AI Chat Transcript
                  {transcript && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {transcript.totalTurns} turns
                    </Badge>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            {transcript?.hadSafetyFlags && (
              <Badge className="bg-amber-100 text-amber-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Safety flags
              </Badge>
            )}
          </div>
          {!isExpanded && (
            <CardDescription className="text-xs mt-1">
              View the full AI intake conversation
            </CardDescription>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2">
            {isPending && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading transcript...
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {transcript && (
              <div className="space-y-4">
                {/* Transcript metadata */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pb-3 border-b">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Started: {formatTime(transcript.startedAt)}
                  </span>
                  {transcript.completedAt && (
                    <span>Completed: {formatTime(transcript.completedAt)}</span>
                  )}
                  <span>Model: {transcript.modelVersion}</span>
                  {transcript.serviceType && (
                    <Badge variant="outline" className="text-xs">
                      {transcript.serviceType}
                    </Badge>
                  )}
                </div>

                {/* Safety flags warning */}
                {transcript.hadSafetyFlags && transcript.safetyFlags.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      Safety Flags Detected
                    </div>
                    <ul className="text-xs text-amber-700 list-disc list-inside">
                      {transcript.safetyFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {transcript.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === "user" 
                          ? "bg-primary/10 text-primary" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className={`flex-1 max-w-[80%] ${
                        message.role === "user" ? "text-right" : ""
                      }`}>
                        <div className={`inline-block p-3 rounded-lg text-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {!transcript.isComplete && (
                  <div className="text-center text-xs text-muted-foreground italic pt-2 border-t">
                    Conversation not completed
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
