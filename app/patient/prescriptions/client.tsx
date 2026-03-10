"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Pill, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  ChevronRight,
  Plus,
  Filter,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/status"
import { formatDate } from "@/lib/format"

interface PrescriptionIntake {
  id: string
  reference_number: string
  status: string
  category: string | null
  subtype: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  service: { id: string; name?: string; short_name?: string; slug?: string; type?: string } | { id: string; name?: string; short_name?: string; slug?: string; type?: string }[] | null
}

interface ActivePrescription {
  id: string
  medication_name: string
  dosage: string
  issued_date: string
  renewal_date: string
  status: "active" | "expired"
}

interface PrescriptionsClientProps {
  prescriptionIntakes: PrescriptionIntake[]
  medicationMap: Record<string, string>
  activePrescriptions: ActivePrescription[]
  error?: string | null
}

function needsRenewalSoon(renewalDate: string): boolean {
  const renewal = new Date(renewalDate)
  const today = new Date()
  const daysUntilRenewal = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilRenewal <= 14 && daysUntilRenewal > 0
}

function getDaysUntilRenewal(renewalDate: string): number {
  const renewal = new Date(renewalDate)
  const today = new Date()
  return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function PrescriptionsClient({
  prescriptionIntakes,
  medicationMap,
  activePrescriptions,
  error,
}: PrescriptionsClientProps) {
  const [activeTab, setActiveTab] = useState("all")
  
  // Filter intakes by status
  const pendingIntakes = prescriptionIntakes.filter(i => 
    ["paid", "in_review", "pending", "pending_info"].includes(i.status)
  )
  const completedIntakes = prescriptionIntakes.filter(i => 
    ["approved", "completed"].includes(i.status)
  )
  const declinedIntakes = prescriptionIntakes.filter(i => 
    ["declined", "cancelled"].includes(i.status)
  )
  
  // Prescriptions needing renewal
  const renewalNeeded = activePrescriptions.filter(p => 
    p.status === "active" && needsRenewalSoon(p.renewal_date)
  )
  
  const getIntakesToShow = () => {
    switch (activeTab) {
      case "pending":
        return pendingIntakes
      case "completed":
        return completedIntakes
      case "declined":
        return declinedIntakes
      default:
        return prescriptionIntakes
    }
  }
  
  const intakesToShow = getIntakesToShow()
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Prescriptions</h1>
          <p className="text-muted-foreground mt-1">
            View your prescription history and manage renewals
          </p>
        </div>
        <Link href="/repeat-prescription/request">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Request Prescription
          </Button>
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 mb-6">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Renewal Alerts */}
      {renewalNeeded.length > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <RefreshCw className="w-5 h-5" />
              Prescriptions Due for Renewal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {renewalNeeded.map((rx) => (
              <div key={rx.id} className="flex items-center justify-between bg-card rounded-xl p-3 border border-amber-100 dark:border-amber-800/50">
                <div>
                  <p className="font-medium">{rx.medication_name}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Renews in {getDaysUntilRenewal(rx.renewal_date)} days
                  </p>
                </div>
                <Link href="/repeat-prescription/request">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                    Renew
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold">{prescriptionIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completedIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{pendingIntakes.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
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
          <TabsTrigger value="pending" className="flex-1">
            <Clock className="w-3.5 h-3.5 hidden sm:block" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            <CheckCircle className="w-3.5 h-3.5 hidden sm:block" />
            Approved
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
                <Pill className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium mb-2">No prescription requests</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "all" 
                    ? "You haven't made any prescription requests yet."
                    : `No ${activeTab} prescription requests.`}
                </p>
                {activeTab === "all" && (
                  <Link href="/repeat-prescription/request">
                    <Button>Request a Prescription</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {intakesToShow.map((intake) => (
                <PrescriptionCard 
                  key={intake.id} 
                  intake={intake}
                  medicationName={medicationMap[intake.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PrescriptionCard({ 
  intake, 
  medicationName 
}: { 
  intake: PrescriptionIntake
  medicationName?: string 
}) {
  const config = INTAKE_STATUS[intake.status as IntakeStatus] || INTAKE_STATUS.pending
  const StatusIcon = config.icon
  
  // Handle service being array or object
  const serviceData = Array.isArray(intake.service) ? intake.service[0] : intake.service
  const serviceName = serviceData?.name || serviceData?.short_name || "Prescription Request"
  const displayName = medicationName || serviceName
  
  return (
    <Link href={`/patient/intakes/${intake.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {displayName}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(intake.created_at)}
                  </span>
                  <span>Ref: {intake.reference_number?.slice(0, 8) || intake.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={cn("flex items-center gap-1", config.color)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {config.label}
              </Badge>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
