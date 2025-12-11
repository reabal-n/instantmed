"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, FileText, Loader2, MessageCircle, Phone, ArrowLeft, Zap, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCategory, formatSubtype } from "@/lib/data/request-utils"

interface Request {
  id: string
  status: string
  category: string | null
  subtype: string | null
  created_at: string
  updated_at: string
  priority_review?: boolean
  patient: {
    full_name: string
    id: string
  }
}

interface TrackingClientProps {
  request: Request
  queuePosition: number
  estimatedMinutes: number
}

type TimelineStep = {
  id: string
  label: string
  description: string
  status: "complete" | "current" | "upcoming"
  timestamp?: string
}

function getTimelineSteps(request: Request): TimelineStep[] {
  const statusMap: Record<string, number> = {
    draft: 0,
    pending: 1,
    in_review: 2,
    approved: 3,
    declined: 3,
    needs_info: 3,
    completed: 4,
  }

  const currentStep = statusMap[request.status] ?? 1

  const steps: TimelineStep[] = [
    {
      id: "submitted",
      label: "Submitted",
      description: "Your request has been received",
      status: currentStep >= 1 ? "complete" : "upcoming",
      timestamp: request.created_at,
    },
    {
      id: "in_queue",
      label: "In Queue",
      description: "Waiting for doctor review",
      status: currentStep === 1 ? "current" : currentStep > 1 ? "complete" : "upcoming",
    },
    {
      id: "under_review",
      label: "Under Review",
      description: "A doctor is reviewing your request",
      status: currentStep === 2 ? "current" : currentStep > 2 ? "complete" : "upcoming",
    },
    {
      id: "complete",
      label:
        request.status === "declined" ? "Declined" : request.status === "needs_info" ? "More Info Needed" : "Complete",
      description:
        request.status === "declined"
          ? "Your request could not be approved"
          : request.status === "needs_info"
            ? "Doctor needs additional information"
            : "Your document is ready",
      status: currentStep >= 3 ? "current" : "upcoming",
      timestamp: currentStep >= 3 ? request.updated_at : undefined,
    },
  ]

  return steps
}

export function TrackingClient({
  request: initialRequest,
  queuePosition: initialQueuePosition,
  estimatedMinutes: initialEstimatedMinutes,
}: TrackingClientProps) {
  const [request, setRequest] = useState(initialRequest)
  const [queuePosition, setQueuePosition] = useState(initialQueuePosition)
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialEstimatedMinutes)

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`request-${request.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
          filter: `id=eq.${request.id}`,
        },
        (payload) => {
          setRequest((prev) => ({ ...prev, ...payload.new }))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [request.id])

  // Update queue position periodically
  useEffect(() => {
    if (request.status !== "pending") return

    const updateQueuePosition = async () => {
      const supabase = createClient()
      const { count } = await supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", request.created_at)

      const newPosition = (count || 0) + 1
      setQueuePosition(newPosition)
      setEstimatedMinutes(newPosition * 15)
    }

    const interval = setInterval(updateQueuePosition, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [request.status, request.created_at])

  const steps = getTimelineSteps(request)
  const isComplete = ["approved", "declined", "needs_info", "completed"].includes(request.status)

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href="/patient"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Request info card */}
        <div className="bg-card border rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold">{formatCategory(request.category)}</h1>
                {request.priority_review && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    <Zap className="w-3 h-3 mr-1" />
                    Priority
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatSubtype(request.subtype)} • Submitted{" "}
                {new Date(request.created_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <Badge
              variant={
                request.status === "approved" || request.status === "completed"
                  ? "default"
                  : request.status === "declined"
                    ? "destructive"
                    : request.status === "needs_info"
                      ? "secondary"
                      : "outline"
              }
            >
              {request.status === "pending"
                ? "In Queue"
                : request.status === "in_review"
                  ? "Under Review"
                  : request.status === "approved"
                    ? "Approved"
                    : request.status === "declined"
                      ? "Declined"
                      : request.status === "needs_info"
                        ? "More Info Needed"
                        : request.status}
            </Badge>
          </div>

          {/* Queue position indicator */}
          {request.status === "pending" && (
            <div className="mt-6 p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Queue Position</span>
                <span className="text-2xl font-bold text-primary">#{queuePosition}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Estimated wait: ~{estimatedMinutes} min</span>
              </div>
              {request.priority_review && (
                <p className="text-xs text-amber-600 mt-2">Priority review — guaranteed within 15 minutes</p>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="relative">
          <h2 className="text-lg font-semibold mb-6">Request Timeline</h2>

          <div className="space-y-0">
            {steps.map((step, index) => (
              <div key={step.id} className="relative flex gap-4">
                {/* Vertical line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-8px)]",
                      step.status === "complete" ? "bg-primary" : "bg-border",
                    )}
                  />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    step.status === "complete"
                      ? "bg-primary text-primary-foreground"
                      : step.status === "current"
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.status === "complete" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : step.status === "current" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-center justify-between">
                    <h3 className={cn("font-medium", step.status === "upcoming" && "text-muted-foreground")}>
                      {step.label}
                    </h3>
                    {step.timestamp && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(step.timestamp).toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 space-y-3">
          {request.status === "needs_info" && (
            <Button className="w-full" size="lg">
              <Phone className="w-4 h-4 mr-2" />
              Request a Call from Doctor
            </Button>
          )}

          {isComplete && request.status === "approved" && (
            <Button className="w-full" size="lg">
              <FileText className="w-4 h-4 mr-2" />
              Download Document
            </Button>
          )}

          <Button variant="outline" className="w-full bg-transparent" asChild>
            <Link href="/patient">
              <User className="w-4 h-4 mr-2" />
              View All Requests
            </Link>
          </Button>
        </div>

        {/* Help section */}
        <div className="mt-8 p-4 bg-muted/50 rounded-xl text-center">
          <p className="text-sm text-muted-foreground mb-2">Questions about your request?</p>
          <Button variant="ghost" size="sm">
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat with Support
          </Button>
        </div>
      </div>
    </main>
  )
}
