"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Activity,
  Send,
  AlertCircle,
  MessageSquare,
  StickyNote,
  Plus,
  Loader2,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useState, useTransition } from "react"
import { addPatientNoteAction } from "@/app/actions/patient-notes"
import { formatIntakeStatus } from "@/lib/format-intake"
import type { Profile } from "@/types/db"

interface IntakeWithService {
  id: string
  status: string
  category: string | null
  subtype: string | null
  created_at: string
  paid_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  payment_status: string | null
  service: { name: string; short_name: string; type: string } | null
}

interface EmailLog {
  id: string
  email_type: string
  to_email: string
  subject: string
  status: string
  delivery_status: string | null
  created_at: string
  sent_at: string | null
  intake_id: string | null
}

interface PatientNote {
  id: string
  content: string
  note_type: string
  created_at: string
  created_by: string
  created_by_name: string | null
}

interface PatientDetailClientProps {
  patient: Profile
  intakes: IntakeWithService[]
  stats: {
    totalRequests: number
    approvedRequests: number
    certificatesIssued: number
  }
  emailLogs: EmailLog[]
  patientNotes: PatientNote[]
}

export function PatientDetailClient({ patient, intakes, stats, emailLogs, patientNotes }: PatientDetailClientProps) {
  const [isPending, startTransition] = useTransition()
  const [newNote, setNewNote] = useState("")
  const [notes, setNotes] = useState<PatientNote[]>(patientNotes)
  const [showNoteForm, setShowNoteForm] = useState(false)

  const handleAddNote = () => {
    if (!newNote.trim()) return
    startTransition(async () => {
      const result = await addPatientNoteAction(patient.id, newNote.trim())
      if (result.success && result.note) {
        setNotes(prev => [result.note as PatientNote, ...prev])
        setNewNote("")
        setShowNoteForm(false)
      }
    })
  }

  const getEmailStatusColor = (status: string, deliveryStatus: string | null) => {
    if (deliveryStatus === "delivered") return "bg-emerald-100 text-emerald-700"
    if (deliveryStatus === "bounced" || deliveryStatus === "failed") return "bg-destructive/10 text-destructive"
    if (status === "sent") return "bg-blue-100 text-blue-700"
    if (status === "pending") return "bg-amber-100 text-amber-700"
    return "bg-muted text-muted-foreground"
  }

  const formatEmailType = (type: string) => {
    const typeMap: Record<string, string> = {
      med_cert_patient: "Certificate",
      welcome: "Welcome",
      request_declined: "Declined",
      script_sent: "Script Sent",
      needs_more_info: "Info Request",
      generic: "Notification",
    }
    return typeMap[type] || type.replace(/_/g, " ")
  }
  const calculateAge = (dob: string | null | undefined): number | null => {
    if (!dob) return null
    const birthDate = new Date(dob)
    if (isNaN(birthDate.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(patient.date_of_birth)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "declined":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "pending_info":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "awaiting_script":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "paid":
      case "in_review":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/doctor/patients">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Link>
        </Button>
        {patient.onboarding_completed ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Onboarded
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <XCircle className="mr-1 h-3 w-3" />
            Incomplete Profile
          </Badge>
        )}
      </div>

      {/* Patient Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Basic info */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">{patient.full_name}</h2>
                {age !== null && (
                  <p className="text-muted-foreground">{age} years old</p>
                )}
              </div>

              <div className="space-y-3">
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {(patient.suburb || patient.state) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {[patient.address_line1, patient.suburb, patient.state, patient.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Additional details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    Date of Birth
                  </div>
                  <p className="font-medium">
                    {patient.date_of_birth
                      ? new Date(patient.date_of_birth).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Not provided"}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <CreditCard className="h-3 w-3" />
                    Medicare
                  </div>
                  <p className="font-medium font-mono">
                    {patient.medicare_number
                      ? `****${patient.medicare_number.slice(-4)}`
                      : "Not provided"}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Member Since
                </div>
                <p className="font-medium">{formatDate(patient.created_at)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Requests</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-semibold mt-2">{stats.totalRequests}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Approved</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-semibold mt-2">{stats.approvedRequests}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Certificates</span>
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-semibold mt-2">{stats.certificatesIssued}</p>
        </Card>
      </div>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Request History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {intakes.length > 0 ? (
            <div className="space-y-3">
              {intakes.map((intake) => (
                <Link
                  key={intake.id}
                  href={`/doctor/intakes/${intake.id}`}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {intake.service?.short_name || intake.service?.name || intake.category || "Request"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatDateTime(intake.created_at)}</span>
                        {intake.paid_at && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600">Paid</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getStatusColor(intake.status)}>
                      {formatIntakeStatus(intake.status)}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No requests yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Patient Notes
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNoteForm(!showNoteForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNoteForm && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <Textarea
                placeholder="Add a note about this patient (internal only, not visible to patient)..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowNoteForm(false); setNewNote("") }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddNote} disabled={isPending || !newNote.trim()}>
                  {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save Note
                </Button>
              </div>
            </div>
          )}
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{note.created_by_name || "Staff"}</span>
                    <span>•</span>
                    <span>{formatDateTime(note.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : !showNoteForm && (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notes yet</p>
              <p className="text-xs mt-1">Add notes to track important patient information</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Communication History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emailLogs.length > 0 ? (
            <div className="space-y-3">
              {emailLogs.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{email.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(email.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formatEmailType(email.email_type)}
                    </Badge>
                    <Badge className={`text-xs ${getEmailStatusColor(email.status, email.delivery_status)}`}>
                      {email.delivery_status === "delivered" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {email.delivery_status === "bounced" && <AlertCircle className="h-3 w-3 mr-1" />}
                      {email.delivery_status || email.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No emails sent yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
