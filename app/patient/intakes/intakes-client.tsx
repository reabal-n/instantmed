"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  FileText,
  Pill,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Filter,
  Calendar,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatIntakeStatus } from "@/lib/format-intake"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { IntakeWithPatient } from "@/types/db"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface IntakesClientProps {
  intakes: IntakeWithPatient[]
  patientId: string
  pagination?: {
    page: number
    total: number
    pageSize: number
  }
}

// Use shared status config — single source of truth
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/status"
import { formatDate } from "@/lib/format"

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
      // The browser Supabase client has no auth session (Clerk-based auth), so
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
    <div className="container max-w-6xl py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your medical requests
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              New Request
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold">{intakes.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{upcomingIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completedIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{declinedIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-6">
          <TabsTrigger value="all" className="flex-1">
            <Filter className="w-3.5 h-3.5 hidden sm:block" />
            All
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">
            <Clock className="w-3.5 h-3.5 hidden sm:block" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <CheckCircle className="w-3.5 h-3.5 hidden sm:block" />
            History
          </TabsTrigger>
          <TabsTrigger value="declined" className="flex-1">
            <XCircle className="w-3.5 h-3.5 hidden sm:block" />
            Declined
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {intakesToShow.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium mb-2">
                  {activeTab === "all" ? "No requests yet" : `No ${activeTab} requests`}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "all" 
                    ? "Start by selecting a service to get your medical certificate or prescription."
                    : activeTab === "upcoming"
                    ? "You don't have any pending requests being reviewed."
                    : activeTab === "history"
                    ? "Your completed requests will appear here."
                    : "No declined requests."}
                </p>
                {activeTab === "all" && (
                  <Link href="/request">
                    <Button>Get Started</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {intakesToShow.map((intake) => (
                <IntakeCard key={intake.id} intake={intake} />
              ))}
              
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

function IntakeCard({ intake }: { intake: IntakeWithPatient }) {
  const config = INTAKE_STATUS[intake.status as IntakeStatus] || INTAKE_STATUS.pending
  const StatusIcon = config.icon
  
  // Handle service being array or object
  const serviceData = Array.isArray(intake.service) ? intake.service[0] : intake.service
  const serviceName = serviceData?.name || serviceData?.short_name || "Request"
  const isPrescription = serviceData?.type === "common_scripts" || intake.category === "prescription"
  
  return (
    <Link href={`/patient/intakes/${intake.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                isPrescription ? "bg-blue-50 dark:bg-blue-950/40" : "bg-primary/10"
              )}>
                {isPrescription ? (
                  <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                ) : (
                  <FileText className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {serviceName}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(intake.created_at)}
                  </span>
                  <span>Ref: {intake.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={cn("flex items-center gap-1", config.color)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {formatIntakeStatus(intake.status)}
              </Badge>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
