"use client"

import { useState } from "react"
import Link from "next/link"
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
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatIntakeStatus } from "@/lib/format-intake"
import type { IntakeWithPatient } from "@/types/db"

interface IntakesClientProps {
  intakes: IntakeWithPatient[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  paid: { label: "Under Review", color: "bg-blue-100 text-blue-700", icon: Clock },
  in_review: { label: "Under Review", color: "bg-blue-100 text-blue-700", icon: Clock },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  declined: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  pending_info: { label: "Info Needed", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700", icon: XCircle },
}

export function IntakesClient({ intakes }: IntakesClientProps) {
  const [activeTab, setActiveTab] = useState("all")
  
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
  
  return (
    <div className="container max-w-4xl py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your medical requests
          </p>
        </div>
        <Link href="/start">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{intakes.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{upcomingIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completedIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{declinedIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Declined</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all" className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="declined" className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
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
                  <Link href="/start">
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
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function IntakeCard({ intake }: { intake: IntakeWithPatient }) {
  const config = STATUS_CONFIG[intake.status] || STATUS_CONFIG.pending
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
                isPrescription ? "bg-blue-50" : "bg-primary/10"
              )}>
                {isPrescription ? (
                  <Pill className="w-6 h-6 text-blue-600" />
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
                    {new Date(intake.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
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
