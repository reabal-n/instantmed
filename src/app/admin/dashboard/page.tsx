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
  Filter
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

// Highlight red flag keywords
function highlightKeywords(text: string): React.ReactNode {
  const lowerText = text.toLowerCase()
  let highlighted = false
  
  for (const keyword of HIGHLIGHT_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      highlighted = true
      break
    }
  }
  
  if (!highlighted) return text
  
  // Create regex pattern from keywords
  const pattern = new RegExp(`(${HIGHLIGHT_KEYWORDS.join('|')})`, 'gi')
  const parts = text.split(pattern)
  
  return parts.map((part, idx) => {
    if (HIGHLIGHT_KEYWORDS.some(k => part.toLowerCase() === k)) {
      return (
        <span key={idx} className="red-flag">
          {part}
        </span>
      )
    }
    return part
  })
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

      if (error) throw error

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

      if (error) throw error

      toast.success('Request approved successfully')
      setSelectedConsultation(null)
      fetchConsultations()
    } catch (error) {
      console.error('Error approving:', error)
      toast.error('Failed to approve request')
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

      if (error) throw error

      toast.success('Request declined')
      setSelectedConsultation(null)
      fetchConsultations()
    } catch (error) {
      console.error('Error declining:', error)
      toast.error('Failed to decline request')
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
    if (type.includes('cert') || type.includes('certificate')) {
      return <FileText className="w-4 h-4" />
    }
    return <Pill className="w-4 h-4" />
  }

  const pendingCount = consultations.filter(c => c.status === 'pending').length
  const priorityCount = consultations.filter(c => c.status === 'pending' && c.priority_review).length

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">InstantMed</span>
            <Badge variant="outline" className="ml-2">Admin</Badge>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Consultations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Consultation Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : consultations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No {filter === 'all' ? '' : filter} consultations found</p>
              </div>
            ) : (
              <div className="divide-y">
                {consultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    className={cn(
                      'flex items-center gap-4 py-4 px-2 -mx-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50',
                      consultation.priority_review && consultation.status === 'pending' && 'bg-orange-50 hover:bg-orange-100'
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
          </CardContent>
        </Card>
      </main>

      {/* Review Panel Dialog */}
      <Dialog open={!!selectedConsultation} onOpenChange={() => setSelectedConsultation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedConsultation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Review Consultation
                  {selectedConsultation.priority_review && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 gap-1">
                      <Zap className="w-3 h-3" />
                      Priority
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Patient Demographics */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {selectedConsultation.patient.full_name ||
                          `${selectedConsultation.patient.first_name} ${selectedConsultation.patient.last_name}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Age</p>
                      <p className="font-medium">
                        {calculateAge(selectedConsultation.patient.date_of_birth)} years old
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">
                        {format(new Date(selectedConsultation.patient.date_of_birth), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">
                        {selectedConsultation.patient.gender || 'Not specified'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Medicare</p>
                      <p className="font-medium font-mono">
                        {formatMedicare(
                          selectedConsultation.patient.medicare_number,
                          selectedConsultation.patient.medicare_irn
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Request Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Request Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">
                        {selectedConsultation.type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      {getStatusBadge(selectedConsultation.status)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="font-medium">
                        {format(new Date(selectedConsultation.created_at), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                    {selectedConsultation.start_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Certificate Start Date
                          {selectedConsultation.backdated && (
                            <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 text-xs">
                              Backdated
                            </Badge>
                          )}
                        </p>
                        <p className="font-medium">
                          {format(new Date(selectedConsultation.start_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Intake Answers */}
                {selectedConsultation.answers && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Clinical Information
                    </h3>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                      {Object.entries(selectedConsultation.answers.answers).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                          </p>
                          <div className="font-medium">
                            {Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {value.map((v, i) => (
                                  <Badge key={i} variant="secondary">
                                    {highlightKeywords(String(v))}
                                  </Badge>
                                ))}
                              </div>
                            ) : typeof value === 'boolean' ? (
                              value ? 'Yes' : 'No'
                            ) : (
                              <p className="whitespace-pre-wrap">
                                {highlightKeywords(String(value))}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedConsultation.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 touch-target border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => handleDecline(selectedConsultation.id)}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Decline
                    </Button>
                    <Button
                      className="flex-1 touch-target bg-green-600 hover:bg-green-700"
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

