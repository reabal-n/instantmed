"use client"

import { 
  CheckCircle, 
  Clock, 
  Filter,
  Pill, 
  Plus,
  RefreshCw,
  XCircle, 
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { DashboardPageHeader } from "@/components/dashboard"
import { PatientErrorAlert, RequestCard, StatGrid } from "@/components/patient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDaysUntilExpiry,needsRenewalSoon } from "@/lib/prescriptions"

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
  dosage_instructions: string
  issued_date: string
  expiry_date: string
  status: "active" | "expired"
}

interface PrescriptionsClientProps {
  prescriptionIntakes: PrescriptionIntake[]
  medicationMap: Record<string, string>
  activePrescriptions: ActivePrescription[]
  error?: string | null
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
    p.status === "active" && needsRenewalSoon(p.expiry_date)
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
    <div className="space-y-4">
      <DashboardPageHeader
        title="My prescriptions"
        description="View your prescription history and manage renewals"
        actions={
          <Link href="/request?service=prescription">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Request prescription
            </Button>
          </Link>
        }
      />

      {/* Error State */}
      {error && <PatientErrorAlert error={error} className="mb-6" />}
      
      {/* Renewal Alerts */}
      {renewalNeeded.length > 0 && (
        <Card className="mb-6 border-warning-border bg-warning-light/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <RefreshCw className="w-5 h-5" />
              Prescriptions Due for Renewal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {renewalNeeded.map((rx) => (
              <div key={rx.id} className="flex items-center justify-between bg-card rounded-xl p-3 border border-warning-border/50">
                <div>
                  <p className="font-medium">{rx.medication_name}</p>
                  <p className="text-sm text-warning">
                    Renews in {getDaysUntilExpiry(rx.expiry_date)} days
                  </p>
                </div>
                <Link href="/request?service=prescription">
                  <Button size="sm">
                    Renew
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Stats */}
      <StatGrid
        className="mb-6"
        items={[
          { value: prescriptionIntakes.length, label: "Total requests" },
          { value: completedIntakes.length, label: "Approved", color: "text-success" },
          { value: pendingIntakes.length, label: "Pending", color: "text-info" },
        ]}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-6">
          <TabsTrigger value="all" className="flex-1">
            <Filter className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
            All
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            <Clock className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            <CheckCircle className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="declined" className="flex-1">
            <XCircle className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
            Declined
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {intakesToShow.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No prescription requests"
              description={
                activeTab === "all"
                  ? "You haven't made any prescription requests yet."
                  : `No ${activeTab} prescription requests.`
              }
              action={activeTab === "all" ? { label: "Request a prescription", href: "/request?service=prescription" } : undefined}
            />
          ) : (
            <div className="space-y-3">
              {intakesToShow.map((intake) => {
                const serviceData = Array.isArray(intake.service) ? intake.service[0] : intake.service
                const serviceName = serviceData?.name || serviceData?.short_name || "Prescription Request"
                const displayName = medicationMap[intake.id] || serviceName
                return (
                  <RequestCard
                    key={intake.id}
                    href={`/patient/intakes/${intake.id}`}
                    title={displayName}
                    date={intake.created_at}
                    refId={intake.reference_number?.slice(0, 8) || intake.id.slice(0, 8)}
                    status={intake.status}
                    icon={Pill}
                    iconClassName="w-5 h-5 text-info"
                    iconContainerClassName="bg-info-light"
                  />
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
