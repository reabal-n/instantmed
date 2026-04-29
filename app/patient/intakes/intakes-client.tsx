"use client"

import type { RealtimeChannel } from "@supabase/supabase-js"
import {
  CheckCircle,
  Clock,
  FileText,
  Filter,
  Pill,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo,useRef, useState } from "react"
import { toast } from "sonner"

import { DashboardPageHeader } from "@/components/dashboard"
import { RequestCard, StatGrid } from "@/components/patient"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { IntakeWithPatient } from "@/types/db"

interface IntakesClientProps {
  intakes: IntakeWithPatient[]
  patientId: string
  pagination?: {
    page: number
    total: number
    pageSize: number
  }
}

// Use shared status config - single source of truth

export function IntakesClient({ intakes: initialIntakes, patientId, pagination }: IntakesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [intakes, setIntakes] = useState<IntakeWithPatient[]>(initialIntakes)
  const [activeTab, setActiveTab] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Memoize Supabase client to prevent memory leak from constant recreation
  const supabase = useMemo(() => createClient(), [])
  
  // Server-side pagination
  const currentPage = pagination?.page ?? 1
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  // Use ref for refreshIntakes to avoid infinite resubscription
  const refreshIntakesRef = useRef<(() => Promise<void>) | undefined>(undefined)
  
  refreshIntakesRef.current = async () => {
    setIsRefreshing(true)
    try {
      // Use Next.js router.refresh() instead of direct Supabase client query
      // The browser Supabase client has no auth session (server-based auth), so
      // RLS policies block all rows. router.refresh() triggers a server-side
      // re-render which uses the service role client and bypasses RLS.
      router.refresh()
    } catch {
      toast.error("Failed to refresh requests")
    } finally {
      // Give the server re-render time to complete
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

  const refreshIntakes = useCallback(() => {
    return refreshIntakesRef.current?.()
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`patient-intakes-${patientId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "intakes",
            filter: `patient_id=eq.${patientId}`,
          },
          (payload) => {
            if (payload.eventType === "UPDATE") {
              // Update the specific intake in state
              setIntakes((prev) =>
                prev.map((intake) =>
                  intake.id === payload.new.id
                    ? { ...intake, ...payload.new }
                    : intake
                )
              )
            } else if (payload.eventType === "INSERT") {
              // Add new intake to state - refresh to get full data with relations
              refreshIntakesRef.current?.()
            } else if (payload.eventType === "DELETE") {
              // Remove deleted intake from state
              setIntakes((prev) =>
                prev.filter((intake) => intake.id !== payload.old.id)
              )
            }
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    // Cleanup on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, patientId])
  
  // Filter intakes by status
  const upcomingIntakes = intakes.filter(i => 
    ["paid", "in_review", "pending", "pending_info"].includes(i.status)
  )
  const completedIntakes = intakes.filter(i => 
    ["approved", "completed"].includes(i.status)
  )
  const declinedIntakes = intakes.filter(i => 
    ["declined", "cancelled"].includes(i.status)
  )
  
  const getIntakesToShow = () => {
    switch (activeTab) {
      case "upcoming":
        return upcomingIntakes
      case "history":
        return completedIntakes
      case "declined":
        return declinedIntakes
      default:
        return intakes
    }
  }
  
  const intakesToShow = getIntakesToShow()
  
  // Navigate to page
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    router.push(`/patient/intakes?${params.toString()}`)
  }
  
  return (
    <div className="space-y-4">
      <DashboardPageHeader
        title="My requests"
        description="View and manage all your medical requests"
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshIntakes}
              disabled={isRefreshing}
              title="Refresh requests"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
            <Link href="/request">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New request
              </Button>
            </Link>
          </>
        }
      />
      
      {/* Stats - show when patient has at least one request */}
      {intakes.length >= 1 && (
        <StatGrid
          className="mb-6"
          items={[
            { value: intakes.length, label: "Total" },
            { value: upcomingIntakes.length, label: "Upcoming", color: "text-info" },
            { value: completedIntakes.length, label: "Completed", color: "text-success" },
            { value: declinedIntakes.length, label: "Declined", color: "text-destructive" },
          ]}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-6">
          <TabsTrigger value="all" className="flex-1">
            <Filter className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
            All ({intakes.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">
            <Clock className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
            Upcoming{upcomingIntakes.length > 0 && ` (${upcomingIntakes.length})`}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <CheckCircle className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
            History{completedIntakes.length > 0 && ` (${completedIntakes.length})`}
          </TabsTrigger>
          <TabsTrigger value="declined" className="flex-1">
            <XCircle className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
            Declined{declinedIntakes.length > 0 && ` (${declinedIntakes.length})`}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {intakesToShow.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={activeTab === "all" ? "No requests yet" : `No ${activeTab} requests`}
              description={
                activeTab === "all" 
                  ? "Start by selecting a service to get your medical certificate or prescription."
                  : activeTab === "upcoming"
                  ? "You don't have any pending requests being reviewed."
                  : activeTab === "history"
                  ? "Your completed requests will appear here."
                  : "No declined requests."
              }
              action={activeTab === "all" ? { label: "Start a request", href: "/request" } : undefined}
              secondaryAction={activeTab === "all" ? { label: "Learn how it works", href: "/how-it-works" } : undefined}
              tips={
                activeTab === "all"
                  ? [
                      "Medical certificates can be issued for past or future dates",
                      "Most requests are reviewed within 1–2 hours (8am–10pm AEST)",
                      "You'll receive an email when your document is ready",
                    ]
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3" aria-live="polite">
              {intakesToShow.map((intake) => {
                const serviceData = Array.isArray(intake.service) ? intake.service[0] : intake.service
                const serviceName = serviceData?.name || serviceData?.short_name || "Request"
                const isPrescription = serviceData?.type === "common_scripts" || intake.category === "prescription"
                return (
                  <RequestCard
                    key={intake.id}
                    href={`/patient/intakes/${intake.id}`}
                    title={serviceName}
                    date={intake.created_at}
                    refId={intake.id.slice(0, 8).toUpperCase()}
                    status={intake.status}
                    icon={isPrescription ? Pill : FileText}
                    iconClassName={isPrescription ? "w-5 h-5 text-info" : "w-5 h-5 text-primary"}
                    iconContainerClassName={isPrescription ? "bg-info-light" : "bg-primary/10"}
                  />
                )
              })}
              
              {/* Server-side Pagination */}
              {pagination && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={!hasPrevPage}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
