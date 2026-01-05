"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectItem,
} from "@/components/ui/select"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Pill,
  FileText,
  Shield,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Flag,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClinicianDecision, RedFlag, RuleOutcome } from "@/types/repeat-rx"

// ============================================================================
// TYPES
// ============================================================================

interface PatientData {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  address: string | null
  medicare_number: string | null
  medicare_irn: string | null
  ihi_number: string | null
}

interface RequestData {
  id: string
  patient_id: string | null
  is_guest: boolean
  guest_email: string | null
  medication_code: string
  medication_display: string
  medication_strength: string
  medication_form: string
  status: string
  eligibility_passed: boolean
  eligibility_result: {
    passed: boolean
    canProceed: boolean
    redFlags: RedFlag[]
    ruleOutcomes: RuleOutcome[]
  }
  clinical_summary: {
    medication: {
      name: string
      strength: string
      form: string
      amtCode: string
    }
    patientReported: {
      indication: string
      currentDose: string
      stabilityDuration: string
      lastPrescribed: string
      originalPrescriber: string
      doseChangedRecently: boolean
      sideEffects: string
      sideEffectsDetails?: string
      pregnantOrBreastfeeding: boolean
      allergies: string[]
      allergyDetails?: string
      pmhxFlags: Record<string, boolean | string>
      otherMedications: string[]
    }
    attestations: {
      emergencyDisclaimer: { accepted: boolean; timestamp: string }
      gpFollowUp: { accepted: boolean; timestamp: string }
      termsAndConditions: { accepted: boolean; timestamp: string }
    }
    eligibility: {
      passed: boolean
      canProceed: boolean
      redFlags: RedFlag[]
      ruleOutcomes: RuleOutcome[]
    }
    suggestedAction: {
      recommendation: "approve" | "decline" | "consult"
      reasoning: string
      suggestedRepeats: number
    }
  }
  emergency_consent_at: string
  gp_attestation_at: string
  created_at: string
  patient: PatientData | null
  answers: Array<{
    id: string
    version: number
    answers: Record<string, unknown>
    created_at: string
  }>
  decisions: Array<{
    id: string
    decision: string
    decision_reason: string
    clinician_id: string
    created_at: string
  }>
}

interface RepeatRxReviewClientProps {
  request: RequestData
  clinicianId: string
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function DataRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        "text-sm text-right max-w-[60%]",
        highlight && "font-semibold text-primary"
      )}>
        {value || "—"}
      </span>
    </div>
  )
}

function RedFlagCard({ flag }: { flag: RedFlag }) {
  const severityColors = {
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    critical: "bg-red-100 text-red-800 border-red-200",
  }
  
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      severityColors[flag.severity]
    )}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm">{flag.code}</p>
          <p className="text-sm opacity-80">{flag.description}</p>
          {flag.clinicianNote && (
            <p className="text-xs opacity-70 mt-1">{flag.clinicianNote}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-blue-100 text-blue-800" },
    approved: { label: "Approved", className: "bg-green-100 text-green-800" },
    declined: { label: "Declined", className: "bg-red-100 text-red-800" },
    requires_consult: { label: "Requires Consult", className: "bg-amber-100 text-amber-800" },
  }
  
  const config = statusConfig[status] || { label: status, className: "bg-muted" }
  
  return (
    <Badge className={config.className}>{config.label}</Badge>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RepeatRxReviewClient({ request, clinicianId: _clinicianId }: RepeatRxReviewClientProps) {
  const router = useRouter()
  const summary = request.clinical_summary
  const patient = request.patient
  
  // Decision form state
  const [decision, setDecision] = useState<ClinicianDecision | null>(null)
  const [decisionReason, setDecisionReason] = useState("")
  const [pbsSchedule, setPbsSchedule] = useState("")
  const [packQuantity, setPackQuantity] = useState("1")
  const [doseInstructions, setDoseInstructions] = useState(summary.patientReported.currentDose)
  const [frequency, _setFrequency] = useState("")
  const [repeatsGranted, setRepeatsGranted] = useState("1")
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [redFlagReview, setRedFlagReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmitDecision = async () => {
    if (!decision) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/repeat-rx/${request.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          decisionReason,
          pbsSchedule: decision === "approved" ? pbsSchedule : null,
          packQuantity: decision === "approved" ? parseInt(packQuantity) : null,
          doseInstructions: decision === "approved" ? doseInstructions : null,
          frequency: decision === "approved" ? frequency : null,
          repeatsGranted: decision === "approved" ? parseInt(repeatsGranted) : 0,
          clinicalNotes,
          redFlagReview: summary.eligibility.redFlags.length > 0 ? redFlagReview : null,
        }),
      })
      
      if (response.ok) {
        router.push("/doctor/repeat-rx")
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold">Repeat Prescription Review</h1>
                  <StatusBadge status={request.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Request #{request.id.slice(0, 8)} • Submitted {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {/* Eligibility quick indicator */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg",
              request.eligibility_passed
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            )}>
              {request.eligibility_passed ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span className="font-medium text-sm">
                {request.eligibility_passed ? "Eligible" : "Requires Review"}
              </span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Clinical info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Red flags section */}
            {summary.eligibility.redFlags.length > 0 && (
              <SectionCard title="Red Flags" icon={Flag} className="border-red-200 bg-red-50/50">
                <div className="space-y-3">
                  {summary.eligibility.redFlags.map((flag, i) => (
                    <RedFlagCard key={i} flag={flag} />
                  ))}
                </div>
              </SectionCard>
            )}
            
            {/* Medication details */}
            <SectionCard title="Medication" icon={Pill}>
              <div className="space-y-0">
                <DataRow label="Name" value={summary.medication.name} highlight />
                <DataRow label="Strength" value={summary.medication.strength} />
                <DataRow label="Form" value={summary.medication.form} />
                <DataRow label="AMT Code" value={summary.medication.amtCode} />
                <DataRow label="Current dose" value={summary.patientReported.currentDose} highlight />
                <DataRow 
                  label="Indication" 
                  value={summary.patientReported.indication} 
                />
              </div>
            </SectionCard>
            
            {/* Clinical history */}
            <SectionCard title="Clinical History" icon={FileText}>
              <Tabs defaultValue="history">
                <TabsList>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="safety">Safety</TabsTrigger>
                  <TabsTrigger value="pmhx">PMHx</TabsTrigger>
                </TabsList>
                
                <TabsContent value="history" className="pt-4">
                  <div className="space-y-0">
                    <DataRow 
                      label="Stability duration" 
                      value={summary.patientReported.stabilityDuration}
                      highlight={summary.patientReported.stabilityDuration === "6_months_plus"}
                    />
                    <DataRow label="Last prescribed" value={summary.patientReported.lastPrescribed} />
                    <DataRow label="Original prescriber" value={summary.patientReported.originalPrescriber} />
                    <DataRow 
                      label="Dose changed recently" 
                      value={summary.patientReported.doseChangedRecently ? "Yes" : "No"}
                      highlight={summary.patientReported.doseChangedRecently}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="safety" className="pt-4">
                  <div className="space-y-0">
                    <DataRow 
                      label="Side effects" 
                      value={summary.patientReported.sideEffects}
                      highlight={summary.patientReported.sideEffects === "significant"}
                    />
                    {summary.patientReported.sideEffectsDetails && (
                      <DataRow 
                        label="Side effects details" 
                        value={summary.patientReported.sideEffectsDetails}
                      />
                    )}
                    <DataRow 
                      label="Pregnant/breastfeeding" 
                      value={summary.patientReported.pregnantOrBreastfeeding ? "Yes" : "No"}
                      highlight={summary.patientReported.pregnantOrBreastfeeding}
                    />
                    <DataRow 
                      label="Allergies" 
                      value={summary.patientReported.allergies.length > 0 
                        ? summary.patientReported.allergies.join(", ")
                        : "None reported"
                      }
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="pmhx" className="pt-4">
                  <div className="space-y-0">
                    {Object.entries(summary.patientReported.pmhxFlags).map(([key, value]) => {
                      if (key === "otherDetails") return null
                      return (
                        <DataRow
                          key={key}
                          label={key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                          value={value ? "Yes" : "No"}
                          highlight={Boolean(value)}
                        />
                      )
                    })}
                    {summary.patientReported.otherMedications.length > 0 && (
                      <DataRow
                        label="Other medications"
                        value={summary.patientReported.otherMedications.join(", ")}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </SectionCard>
            
            {/* Attestations */}
            <SectionCard title="Attestations" icon={Shield}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    Emergency disclaimer confirmed at{" "}
                    {new Date(summary.attestations.emergencyDisclaimer.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    GP follow-up attestation at{" "}
                    {new Date(summary.attestations.gpFollowUp.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    Terms accepted at{" "}
                    {new Date(summary.attestations.termsAndConditions.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>
          
          {/* Right column - Patient info and decision */}
          <div className="space-y-6">
            {/* Patient info */}
            <SectionCard title="Patient" icon={User}>
              {patient ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{patient.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        DOB: {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "Not provided"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{patient.email}</span>
                    </div>
                    {patient.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{patient.address}</span>
                      </div>
                    )}
                  </div>
                  
                  {patient.medicare_number && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Medicare</p>
                      <p className="text-sm font-mono">
                        {patient.medicare_number} / {patient.medicare_irn}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>Guest patient</p>
                  <p>{request.guest_email}</p>
                </div>
              )}
            </SectionCard>
            
            {/* AI suggestion */}
            <SectionCard title="Suggested Action" icon={ClipboardList}>
              <div className={cn(
                "p-4 rounded-lg",
                summary.suggestedAction.recommendation === "approve"
                  ? "bg-green-50 border border-green-200"
                  : summary.suggestedAction.recommendation === "decline"
                  ? "bg-red-50 border border-red-200"
                  : "bg-amber-50 border border-amber-200"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {summary.suggestedAction.recommendation === "approve" ? (
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                  ) : summary.suggestedAction.recommendation === "decline" ? (
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="font-semibold capitalize">
                    {summary.suggestedAction.recommendation}
                  </span>
                </div>
                <p className="text-sm">{summary.suggestedAction.reasoning}</p>
                {summary.suggestedAction.recommendation === "approve" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Suggested repeats: {summary.suggestedAction.suggestedRepeats}
                  </p>
                )}
              </div>
            </SectionCard>
            
            {/* Decision form */}
            {request.status === "pending" || request.status === "requires_consult" ? (
              <SectionCard title="Your Decision" className="border-primary/20">
                <div className="space-y-4">
                  {/* Decision buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setDecision("approved")}
                      className={cn(
                        "p-3 rounded-lg border-2 text-center transition-all",
                        decision === "approved"
                          ? "border-green-500 bg-green-50"
                          : "border-border hover:border-green-300"
                      )}
                    >
                      <CheckCircle className={cn(
                        "w-5 h-5 mx-auto mb-1",
                        decision === "approved" ? "text-green-600" : "text-muted-foreground"
                      )} />
                      <span className="text-xs font-medium">Approve</span>
                    </button>
                    
                    <button
                      onClick={() => setDecision("requires_consult")}
                      className={cn(
                        "p-3 rounded-lg border-2 text-center transition-all",
                        decision === "requires_consult"
                          ? "border-amber-500 bg-amber-50"
                          : "border-border hover:border-amber-300"
                      )}
                    >
                      <MessageSquare className={cn(
                        "w-5 h-5 mx-auto mb-1",
                        decision === "requires_consult" ? "text-amber-600" : "text-muted-foreground"
                      )} />
                      <span className="text-xs font-medium">Consult</span>
                    </button>
                    
                    <button
                      onClick={() => setDecision("declined")}
                      className={cn(
                        "p-3 rounded-lg border-2 text-center transition-all",
                        decision === "declined"
                          ? "border-red-500 bg-red-50"
                          : "border-border hover:border-red-300"
                      )}
                    >
                      <XCircle className={cn(
                        "w-5 h-5 mx-auto mb-1",
                        decision === "declined" ? "text-red-600" : "text-muted-foreground"
                      )} />
                      <span className="text-xs font-medium">Decline</span>
                    </button>
                  </div>
                  
                  {/* Reason (always required) */}
                  <div className="space-y-2">
                    <Label>Decision reason *</Label>
                    <Textarea
                      value={decisionReason}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDecisionReason(e.target.value)}
                      placeholder="Explain your decision..."
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  {/* Red flag review */}
                  {summary.eligibility.redFlags.length > 0 && (
                    <div className="space-y-2">
                      <Label>Red flag review *</Label>
                      <Textarea
                        value={redFlagReview}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRedFlagReview(e.target.value)}
                        placeholder="Document your review of the flagged issues..."
                        className="min-h-[80px]"
                      />
                    </div>
                  )}
                  
                  {/* Approval-specific fields */}
                  {decision === "approved" && (
                    <>
                      <div className="space-y-2">
                        <Label>PBS Schedule</Label>
                        <Select
                          selectedKeys={pbsSchedule ? [pbsSchedule] : []}
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string
                            setPbsSchedule(selected)
                          }}
                          placeholder="Select PBS schedule"
                        >
                          <SelectItem key="s85">S85 - General Schedule</SelectItem>
                          <SelectItem key="s100">S100 - Highly Specialised</SelectItem>
                          <SelectItem key="private">Private (non-PBS)</SelectItem>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Pack quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={packQuantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPackQuantity(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Repeats (max 1)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            value={repeatsGranted}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepeatsGranted(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Dose/frequency</Label>
                        <Input
                          value={doseInstructions}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoseInstructions(e.target.value)}
                          placeholder="e.g., 10mg once daily"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Clinical notes */}
                  <div className="space-y-2">
                    <Label>Clinical notes (optional)</Label>
                    <Textarea
                      value={clinicalNotes}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClinicalNotes(e.target.value)}
                      placeholder="Any additional notes..."
                    />
                  </div>
                  
                  {/* Submit */}
                  <Button
                    onClick={handleSubmitDecision}
                    disabled={!decision || !decisionReason || isSubmitting}
                    className="w-full h-12"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>Submit Decision</>
                    )}
                  </Button>
                </div>
              </SectionCard>
            ) : (
              <SectionCard title="Decision Made">
                <div className="space-y-2">
                  <StatusBadge status={request.status} />
                  {request.decisions?.[0] && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {request.decisions[0].decision_reason}
                    </p>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
