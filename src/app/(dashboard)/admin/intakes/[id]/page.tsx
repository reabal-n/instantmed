import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/auth'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { CountdownTimer } from '@/components/sla/countdown-timer'
import { AttachmentList } from '@/components/attachments/attachment-list'
import { AdminActionButtons } from '@/components/admin/admin-action-buttons'
import { ClinicalSummary } from '@/components/admin/clinical-summary'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  Shield,
  FileText,
  Clock,
  CheckCircle,
  Pill,
  Heart,
  AlertCircle,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminIntakeDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const adminProfile = await getProfile()

  // Fetch complete intake data
  const { data: intake, error } = await supabase
    .from('intakes')
    .select(`
      *,
      profiles!patient_id (
        id,
        full_name,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        address_line_1,
        suburb,
        state,
        postcode,
        medicare_number,
        medicare_irn,
        medicare_expiry
      ),
      services (
        id,
        name,
        type,
        slug,
        price_cents
      ),
      intake_answers (
        id,
        answers,
        has_allergies,
        allergy_details,
        has_current_medications,
        current_medications,
        has_medical_conditions,
        medical_conditions,
        red_flags,
        yellow_flags,
        current_weight_kg,
        height_cm,
        bmi,
        symptom_severity
      ),
      consents (
        id,
        consent_type,
        consent_version,
        is_granted,
        granted_at,
        client_ip
      ),
      attachments (
        id,
        file_name,
        file_type,
        file_size_bytes,
        attachment_type,
        is_verified,
        created_at
      ),
      admin_actions (
        id,
        action_type,
        notes,
        created_at,
        profiles:admin_id (full_name)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !intake) {
    notFound()
  }

  const patient = intake.profiles as unknown as {
    id: string
    full_name: string
    first_name: string
    last_name: string
    email: string
    phone: string
    date_of_birth: string
    address_line_1: string
    suburb: string
    state: string
    postcode: string
    medicare_number: string
    medicare_irn: number
    medicare_expiry: string
  }

  const service = intake.services as unknown as {
    name: string
    type: string
    slug: string
  }

  const answers = intake.intake_answers?.[0] as unknown as {
    answers: Record<string, unknown>
    has_allergies: boolean
    allergy_details: string
    has_current_medications: boolean
    current_medications: string[]
    has_medical_conditions: boolean
    medical_conditions: string[]
    red_flags: string[]
    yellow_flags: string[]
    current_weight_kg: number
    height_cm: number
    bmi: number
    symptom_severity: string
  } | undefined

  const consents = intake.consents as unknown as Array<{
    consent_type: string
    is_granted: boolean
    granted_at: string
    client_ip: string
  }>

  const attachments = intake.attachments as unknown as Array<{
    id: string
    file_name: string
    file_type: string
    file_size_bytes: number
    attachment_type: string
    is_verified: boolean
    created_at: string
  }>

  const adminActions = intake.admin_actions as unknown as Array<{
    action_type: string
    notes: string
    created_at: string
    profiles: { full_name: string }
  }>

  const isHighRisk = intake.risk_tier === 'high' || intake.risk_tier === 'critical'
  const canApprove = adminProfile?.can_approve_high_risk || !isHighRisk

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/queue">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{intake.reference_number}</h1>
              <StatusBadge status={intake.status} />
              <RiskBadge tier={intake.risk_tier} score={intake.risk_score} />
            </div>
            <p className="text-muted-foreground">{service.name}</p>
          </div>
        </div>

        {/* SLA Timer */}
        {intake.sla_deadline && ['paid', 'in_review'].includes(intake.status) && (
          <CountdownTimer deadline={intake.sla_deadline} size="lg" />
        )}
      </div>

      {/* Risk Alerts */}
      {intake.risk_reasons && intake.risk_reasons.length > 0 && (
        <Alert variant={isHighRisk ? 'destructive' : 'warning'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Risk Factors Identified</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {intake.risk_reasons.map((reason: string, i: number) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient & Clinical Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Patient Identity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{patient.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {patient.date_of_birth ? formatDate(patient.date_of_birth) : 'Not provided'}
                    {patient.date_of_birth && (
                      <span className="text-muted-foreground">
                        ({calculateAge(patient.date_of_birth)} years)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {patient.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {patient.phone || 'Not provided'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {patient.address_line_1
                      ? `${patient.address_line_1}, ${patient.suburb} ${patient.state} ${patient.postcode}`
                      : 'Not provided'}
                  </p>
                </div>
                {patient.medicare_number && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Medicare</p>
                    <p className="font-medium">
                      {patient.medicare_number} / {patient.medicare_irn}
                      {patient.medicare_expiry && ` (Exp: ${patient.medicare_expiry})`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Medical History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Allergies */}
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Allergies
                </p>
                {answers?.has_allergies ? (
                  <p className="mt-1 text-sm bg-red-50 p-2 rounded border border-red-200 text-red-700">
                    {answers.allergy_details || 'Details not specified'}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No known allergies</p>
                )}
              </div>

              {/* Current Medications */}
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-500" />
                  Current Medications
                </p>
                {answers?.has_current_medications ? (
                  <div className="mt-1 text-sm bg-blue-50 p-2 rounded border border-blue-200">
                    {Array.isArray(answers.current_medications)
                      ? answers.current_medications.join(', ')
                      : 'See questionnaire answers'}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No current medications</p>
                )}
              </div>

              {/* Medical Conditions */}
              <div>
                <p className="text-sm font-medium">Medical Conditions</p>
                {answers?.has_medical_conditions ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Array.isArray(answers.medical_conditions) &&
                      answers.medical_conditions.map((condition, i) => (
                        <Badge key={i} variant="secondary">
                          {condition}
                        </Badge>
                      ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No chronic conditions reported</p>
                )}
              </div>

              {/* BMI if applicable */}
              {answers?.bmi && (
                <div>
                  <p className="text-sm font-medium">BMI</p>
                  <p className="mt-1">
                    <span className="text-2xl font-semibold">{answers.bmi.toFixed(1)}</span>
                    <span className="text-muted-foreground ml-2">
                      ({answers.current_weight_kg}kg / {answers.height_cm}cm)
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questionnaire Answers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Questionnaire Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {answers?.answers ? (
                <div className="space-y-3">
                  {Object.entries(answers.answers).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-muted-foreground">{formatQuestionKey(key)}</span>
                      <span className="col-span-2 font-medium">
                        {formatAnswerValue(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No questionnaire data available</p>
              )}
            </CardContent>
          </Card>

          {/* Clinical Summary Generator */}
          <ClinicalSummary
            intake={intake}
            patient={patient}
            answers={answers}
            service={service}
          />
        </div>

        {/* Right Column - Attachments, Consents, Audit */}
        <div className="space-y-6">
          {/* Red/Yellow Flags */}
          {(answers?.red_flags?.length > 0 || answers?.yellow_flags?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Clinical Flags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {answers?.red_flags?.map((flag, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm bg-red-50 p-2 rounded border border-red-200 text-red-700"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {flag}
                  </div>
                ))}
                {answers?.yellow_flags?.map((flag, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm bg-amber-50 p-2 rounded border border-amber-200 text-amber-700"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {flag}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Attachments ({attachments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentList
                attachments={attachments || []}
                canVerify
                onVerify={async (id) => {
                  'use server'
                  // Verification handled via API
                }}
              />
            </CardContent>
          </Card>

          {/* Consents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Consent Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              {consents && consents.length > 0 ? (
                <div className="space-y-2">
                  {consents.map((consent, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{formatConsentType(consent.consent_type)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(consent.granted_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No consents recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adminActions?.slice(0, 5).map((action, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatActionType(action.action_type)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(action.created_at)}
                      </span>
                    </div>
                    {action.notes && (
                      <p className="text-muted-foreground mt-0.5">{action.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      by {action.profiles?.full_name || 'System'}
                    </p>
                  </div>
                ))}
                {(!adminActions || adminActions.length === 0) && (
                  <p className="text-sm text-muted-foreground">No actions yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Action Bar */}
      <AdminActionButtons
        intakeId={intake.id}
        currentStatus={intake.status}
        canApprove={canApprove}
        isHighRisk={isHighRisk}
      />
    </div>
  )
}

// Helper functions
function calculateAge(dob: string): number {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function formatQuestionKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
}

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined) return 'Not provided'
  return String(value)
}

function formatConsentType(type: string): string {
  const labels: Record<string, string> = {
    telehealth_terms: 'Telehealth Terms',
    privacy_policy: 'Privacy Policy',
    fee_agreement: 'Fee Agreement',
    escalation_agreement: 'Escalation Terms',
    medication_consent: 'Medication Consent',
    treatment_consent: 'Treatment Consent',
  }
  return labels[type] || type
}

function formatActionType(type: string): string {
  const labels: Record<string, string> = {
    viewed: 'Viewed',
    assigned: 'Assigned',
    requested_info: 'Requested Info',
    approved: 'Approved',
    declined: 'Declined',
    escalated: 'Escalated',
    added_note: 'Added Note',
  }
  return labels[type] || type
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    paid: { label: 'In Queue', variant: 'default' },
    in_review: { label: 'Reviewing', variant: 'default' },
    pending_info: { label: 'Awaiting Info', variant: 'secondary' },
    approved: { label: 'Approved', variant: 'default' },
    declined: { label: 'Declined', variant: 'destructive' },
  }
  const { label, variant } = config[status] || { label: status, variant: 'secondary' }
  return <Badge variant={variant}>{label}</Badge>
}

function RiskBadge({ tier, score }: { tier: string | null; score: number }) {
  if (!tier) return null
  
  const config: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    moderate: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config[tier]}`}>
      {tier.toUpperCase()} ({score})
    </span>
  )
}
