'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { 
  Stethoscope, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  FileText,
  Pill,
  Zap,
  Calendar,
  User,
  ChevronRight,
  FlaskConical
} from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { HIGHLIGHT_KEYWORDS } from '@/lib/types'

interface Consultation {
  id: string
  patient_id: string
  type: string
  category: string | null
  status: string
  paid: boolean
  payment_status: string
  priority_review: boolean
  start_date: string | null
  backdated: boolean
  clinical_notes: string | null
  created_at: string
  patient: {
    id: string
    first_name: string | null
    last_name: string | null
    full_name: string
    date_of_birth: string
    gender: string | null
    medicare_number: string | null
    medicare_irn: number | null
  }
  answers: {
    answers: Record<string, unknown>
  } | null
}

// Highlight red flag keywords with red badges
function highlightKeywords(text: string): React.ReactNode {
  const lowerText = text.toLowerCase()
  const foundKeywords: string[] = []
  
  // Find all keywords in the text
  for (const keyword of HIGHLIGHT_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword)
    }
  }
  
  if (foundKeywords.length === 0) return text
  
  // Create regex pattern from keywords (case insensitive)
  const pattern = new RegExp(`(${HIGHLIGHT_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(pattern)
  
  return (
    <span>
      {parts.map((part, idx) => {
        const isKeyword = HIGHLIGHT_KEYWORDS.some(k => part.toLowerCase() === k.toLowerCase())
        if (isKeyword) {
          return (
            <Badge 
              key={idx} 
              className="bg-red-600 text-white hover:bg-red-700 mx-1 font-semibold"
            >
              {part}
            </Badge>
          )
        }
        return <span key={idx}>{part}</span>
      })}
    </span>
  )
}

// Calculate age from DOB
function calculateAge(dob: string): number {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Format Medicare number
function formatMedicare(number: string | null, irn: number | null): string {
  if (!number) return 'Not provided'
  const formatted = `${number.slice(0, 4)} ${number.slice(4, 9)} ${number.slice(9)}`
  return irn ? `${formatted}-${irn}` : formatted
}

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchConsultations = useCallback(async () => {
    try {
      let query = supabase
        .from('requests')
        .select(`
          *,
          patient:profiles!patient_id (
            id,
            first_name,
            last_name,
            full_name,
            date_of_birth,
            gender,
            medicare_number,
            medicare_irn
          ),
          answers:request_answers (
            answers
          )
        `)
        .eq('paid', true)
        .order('priority_review', { ascending: false })
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching consultations:', error)
        toast.error('Failed to load consultations')
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Transform the data - answers comes as an array, we need the first item
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = (data || []).map((item: any) => ({
        ...item,
        answers: item.answers?.[0] || null,
      }))

      setConsultations(transformed)
    } catch (error) {
      console.error('Error fetching consultations:', error)
      toast.error('Failed to load consultations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase, filter])

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchConsultations()
  }

  const handleApprove = async (id: string) => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'approved' })
        .eq('id', id)

      if (error) {
        console.error('Error approving request:', error)
        toast.error('Failed to approve request')
        setActionLoading(false)
        return
      }

      const consultation = consultations.find(c => c.id === id)
      const patientName = consultation?.patient.full_name || 
        `${consultation?.patient.first_name} ${consultation?.patient.last_name}` || 'Patient'
      
      toast.success(`Script Approved for ${patientName}`)
      setSelectedConsultation(null)
      await fetchConsultations()
    } catch (error) {
      console.error('Unexpected error approving:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async (id: string) => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'declined' })
        .eq('id', id)

      if (error) {
        console.error('Error declining request:', error)
        toast.error('Failed to decline request')
        setActionLoading(false)
        return
      }

      toast.success('Request declined')
      setSelectedConsultation(null)
      await fetchConsultations()
    } catch (error) {
      console.error('Unexpected error declining:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>
      case 'declined':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Declined</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    if (type.includes('cert') || type.includes('certificate') || type === 'sick_cert') {
      return <FileText className="w-4 h-4" />
    }
    if (type === 'pathology') {
      return <FlaskConical className="w-4 h-4" />
    }
    if (type === 'referral') {
      return <Stethoscope className="w-4 h-4" />
    }
    return <Pill className="w-4 h-4" />
  }

  const pendingCount = consultations.filter(c => c.status === 'pending').length
  const priorityCount = consultations.filter(c => c.status === 'pending' && c.priority_review).length

  return (
    <div className="min-h-screen bg-warm">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">InstantMed</span>
            <Badge className="ml-2 bg-slate-900 text-white hover:bg-slate-800">Admin</Badge>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 rounded-lg border-slate-200"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Split-Pane Layout */}
      <main className="flex h-[calc(100vh-4rem)]">
        {/* Left Pane - Consultation List */}
        <div className="w-full md:w-1/2 lg:w-2/5 border-r border-slate-100 overflow-y-auto bg-white">
          <div className="p-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{priorityCount}</p>
                  <p className="text-xs text-muted-foreground">Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {consultations.filter(c => c.status === 'approved').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {consultations.filter(c => c.status === 'declined').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Declined</p>
                </div>
              </div>
            </CardContent>
              </Card>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
              <TabsList className="w-full">
                <TabsTrigger value="pending" className="gap-2 flex-1">
                  <Clock className="w-4 h-4" />
                  Pending
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800 text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex-1">Approved</TabsTrigger>
                <TabsTrigger value="declined" className="flex-1">Declined</TabsTrigger>
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Consultations List */}
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
                </div>
              ) : consultations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No {filter === 'all' ? '' : filter} consultations found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {consultations.map((consultation) => (
                    <div
                      key={consultation.id}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border-2',
                        selectedConsultation?.id === consultation.id
                          ? 'border-teal-600 bg-teal-50 shadow-md'
                          : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50',
                        consultation.priority_review && consultation.status === 'pending' && 'border-orange-300 bg-orange-50'
                      )}
                      onClick={() => setSelectedConsultation(consultation)}
                    >
                    {/* Type Icon */}
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      consultation.type.includes('cert') ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    )}>
                      {getTypeIcon(consultation.type)}
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {consultation.patient.full_name || 
                            `${consultation.patient.first_name} ${consultation.patient.last_name}`}
                        </span>
                        {consultation.priority_review && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 gap-1">
                            <Zap className="w-3 h-3" />
                            Priority
                          </Badge>
                        )}
                        {consultation.backdated && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 gap-1">
                            <Calendar className="w-3 h-3" />
                            Backdated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="capitalize">
                          {consultation.type.replace(/_/g, ' ')}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(consultation.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(consultation.status)}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane - Review Panel */}
        <div className="hidden md:flex md:w-1/2 lg:w-3/5 overflow-y-auto bg-warm">
          {selectedConsultation ? (
            <div className="w-full p-6">
              {/* Floating Action Bar */}
              {selectedConsultation.status === 'pending' && (
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 p-4 -mx-6 mb-6 rounded-t-xl">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 h-12 min-h-[44px] border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl"
                      onClick={() => handleDecline(selectedConsultation.id)}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Reject
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 h-12 min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-600/20"
                      onClick={() => handleApprove(selectedConsultation.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Patient Demographics */}
                <Card className="border-2 border-slate-100 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
                      <User className="w-5 h-5 text-teal-600" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs text-muted-foreground font-medium mb-1">Name</dt>
                        <dd className="font-semibold text-base">
                          {selectedConsultation.patient.full_name ||
                            `${selectedConsultation.patient.first_name} ${selectedConsultation.patient.last_name}`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground font-medium mb-1">Age</dt>
                        <dd className="font-semibold text-base">
                          {calculateAge(selectedConsultation.patient.date_of_birth)} years old
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground font-medium mb-1">Date of Birth</dt>
                        <dd className="font-semibold text-base">
                          {format(new Date(selectedConsultation.patient.date_of_birth), 'dd MMM yyyy')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground font-medium mb-1">Gender</dt>
                        <dd className="font-semibold text-base capitalize">
                          {selectedConsultation.patient.gender || 'Not specified'}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-muted-foreground font-medium mb-1">Medicare</dt>
                        <dd className="font-semibold text-base font-mono">
                          {formatMedicare(
                            selectedConsultation.patient.medicare_number,
                            selectedConsultation.patient.medicare_irn
                          )}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* Request Details */}
                <Card className="border-2 border-slate-100 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
                      <FileText className="w-5 h-5 text-teal-600" />
                      Request Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs text-muted-foreground font-medium mb-1">Type</dt>
                        <dd className="font-semibold text-base capitalize">
                          {selectedConsultation.type.replace(/_/g, ' ')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground font-medium mb-1">Status</dt>
                        <dd>{getStatusBadge(selectedConsultation.status)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground font-medium mb-1">Submitted</dt>
                        <dd className="font-semibold text-base">
                          {format(new Date(selectedConsultation.created_at), 'dd MMM yyyy HH:mm')}
                        </dd>
                      </div>
                      {selectedConsultation.start_date && (
                        <div>
                          <dt className="text-xs text-muted-foreground font-medium mb-1">
                            Certificate Start Date
                            {selectedConsultation.backdated && (
                              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 text-xs">
                                Backdated
                              </Badge>
                            )}
                          </dt>
                          <dd className="font-semibold text-base">
                            {format(new Date(selectedConsultation.start_date), 'dd MMM yyyy')}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {/* Intake Answers with Red Flag Highlighting */}
                {selectedConsultation.answers && (
                  <Card className="border-2 border-slate-100 rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        Clinical Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-4">
                        {Object.entries(selectedConsultation.answers.answers).map(([key, value]) => (
                          <div key={key} className="pb-4 border-b border-gray-100 last:border-0">
                            <dt className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                              {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                            </dt>
                            <dd className="font-medium text-base">
                              {Array.isArray(value) ? (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {value.map((v, i) => (
                                    <div key={i}>
                                      {highlightKeywords(String(v))}
                                    </div>
                                  ))}
                                </div>
                              ) : typeof value === 'boolean' ? (
                                <Badge variant={value ? 'default' : 'secondary'}>
                                  {value ? 'Yes' : 'No'}
                                </Badge>
                              ) : (
                                <div className="mt-2 whitespace-pre-wrap leading-relaxed">
                                  {highlightKeywords(String(value))}
                                </div>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a consultation to review</p>
                <p className="text-sm mt-2">Click on a request from the list to see details</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Review Panel - Show as overlay on mobile */}
      {selectedConsultation && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white rounded-t-xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-tight">Review Consultation</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConsultation(null)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Patient Demographics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold tracking-tight">Patient Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-muted-foreground font-medium mb-1">Name</dt>
                      <dd className="font-semibold">
                        {selectedConsultation.patient.full_name ||
                          `${selectedConsultation.patient.first_name} ${selectedConsultation.patient.last_name}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground font-medium mb-1">Age</dt>
                      <dd className="font-semibold">
                        {calculateAge(selectedConsultation.patient.date_of_birth)} years old
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Action Buttons for Mobile */}
              {selectedConsultation.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-12 min-h-[44px] border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => handleDecline(selectedConsultation.id)}
                    disabled={actionLoading}
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reject
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-12 min-h-[44px] bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(selectedConsultation.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

