"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  FileText, 
  Pill, 
  Stethoscope, 
  Clock, 
  CheckCircle,
  ChevronRight,
  Download,
  Calendar,
  Activity,
  Shield
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/status"
import type { HealthSummary, RecentRequest, MedicalDocument, PrescriptionRecord } from "@/lib/data/health-summary"

interface HealthSummaryClientProps {
  summary: HealthSummary
}

function resolveStatusConfig(status: string) {
  return INTAKE_STATUS[status as IntakeStatus] ?? INTAKE_STATUS.pending
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  medical_certificate: FileText,
  prescription: Pill,
  consult: Stethoscope,
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  className 
}: { 
  title: string
  value: number
  icon: React.ElementType
  description?: string
  className?: string
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-xl">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RequestRow({ request }: { request: RecentRequest }) {
  const statusConfig = resolveStatusConfig(request.status)
  const CategoryIcon = CATEGORY_ICONS[request.category || ""] || FileText
  const StatusIcon = statusConfig.icon
  
  return (
    <Link 
      href={`/patient/intakes/${request.id}`}
      className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-xl transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-muted rounded-xl">
          <CategoryIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">{request.service?.name || "Request"}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(request.created_at)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig.label}
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  )
}

function formatDateOrDash(dateStr?: string): string {
  if (!dateStr) return "—"
  return formatDate(dateStr)
}

function MedCertCard({ cert }: { cert: MedicalDocument }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-xl">
              <FileText className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="font-medium text-sm">Medical Certificate</p>
              <p className="text-xs text-muted-foreground">
                {formatDateOrDash(cert.start_date)} – {formatDateOrDash(cert.end_date)}
              </p>
            </div>
          </div>
          <Link href={`/patient/intakes/${cert.intake_id}`}>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-1" />
              View
            </Button>
          </Link>
        </div>
        {cert.verification_code && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Verification Code</p>
            <p className="font-mono text-sm font-medium">{cert.verification_code}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PrescriptionCard({ prescription }: { prescription: PrescriptionRecord }) {
  const statusConfig = resolveStatusConfig(prescription.status)
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-light rounded-xl">
              <Pill className="w-4 h-4 text-info" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {prescription.medication_name || "Prescription Request"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(prescription.created_at)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function HealthSummaryClient({ summary }: HealthSummaryClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  
  const memberSinceDate = new Date(summary.memberSince).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric"
  })
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Health Summary</h1>
          <p className="text-muted-foreground mt-1">
            Your complete medical history with InstantMed
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Member since {memberSinceDate}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Data secured &amp; encrypted
            </span>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Requests" 
          value={summary.stats.totalRequests} 
          icon={Activity}
          description="All time"
        />
        <StatCard 
          title="Completed" 
          value={summary.stats.completedRequests} 
          icon={CheckCircle}
          description="Successfully processed"
        />
        <StatCard 
          title="Medical Certs" 
          value={summary.stats.medicalCertificates} 
          icon={FileText}
        />
        <StatCard 
          title="Prescriptions" 
          value={summary.stats.prescriptions} 
          icon={Pill}
        />
      </div>
      
      {/* Active Requests Alert */}
      {summary.stats.activeRequests > 0 && (
        <Card className="mb-8 border-warning-border bg-warning-light">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-amber-900">
                    {summary.stats.activeRequests} active request{summary.stats.activeRequests > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-warning">
                    Currently being reviewed by our doctors
                  </p>
                </div>
              </div>
              <Link href="/patient/intakes">
                <Button variant="outline" size="sm" className="border-warning-border hover:bg-warning-light">
                  View All
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview">Recent Activity</TabsTrigger>
          <TabsTrigger value="certificates">Medical Certificates</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Requests</CardTitle>
              <CardDescription>Your last 10 requests</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.recentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No requests yet</p>
                  <Link href="/request">
                    <Button className="mt-4">Start your first request</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {summary.recentRequests.map(request => (
                    <RequestRow key={request.id} request={request} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Certificates Tab */}
        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medical Certificates</CardTitle>
              <CardDescription>All your approved medical certificates</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.medicalCertificates.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No medical certificates yet</p>
                  <Link href="/medical-certificate">
                    <Button className="mt-4">Request a certificate</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {summary.medicalCertificates.map(cert => (
                    <MedCertCard key={cert.id} cert={cert} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prescription History</CardTitle>
              <CardDescription>Your prescription requests</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.prescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No prescriptions yet</p>
                  <Link href="/request?service=prescription">
                    <Button className="mt-4">Request a prescription</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {summary.prescriptions.map(prescription => (
                    <PrescriptionCard key={prescription.id} prescription={prescription} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Quick Actions */}
      <div className="mt-8 pt-8 border-t">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/request?service=med-cert">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-success-light rounded-xl">
                  <FileText className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium">Medical Certificate</p>
                  <p className="text-sm text-muted-foreground">Get a sick note</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/request?service=prescription">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-info-light rounded-xl">
                  <Pill className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="font-medium">Repeat Prescription</p>
                  <p className="text-sm text-muted-foreground">Renew your medication</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/patient/settings">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-info-light rounded-xl">
                  <Shield className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="font-medium">Account Settings</p>
                  <p className="text-sm text-muted-foreground">Manage your profile</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
