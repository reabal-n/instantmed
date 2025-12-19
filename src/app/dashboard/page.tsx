'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  Stethoscope, 
  FileText, 
  Pill, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  Plus,
  User,
  LogOut,
  FlaskConical,
  Download,
  Mail,
  Calendar,
  Zap,
  X
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
}

interface Request {
  id: string
  type: string
  status: string
  paid: boolean
  payment_status: string
  priority_review: boolean
  start_date: string | null
  backdated: boolean
  created_at: string
  updated_at: string
}

interface Profile {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  email?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login?redirect=/dashboard')
        return
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name')
        .eq('auth_user_id', user.id)
        .single()

      if (profileData) {
        setProfile({ ...profileData, email: user.email })

        // Fetch requests
        const { data: requestsData } = await supabase
          .from('requests')
          .select('*')
          .eq('patient_id', profileData.id)
          .order('created_at', { ascending: false })

        if (requestsData) {
          setRequests(requestsData)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/')
  }

  const getStatusBadge = (status: string, paymentStatus: string, size: 'sm' | 'md' = 'sm') => {
    const baseClasses = size === 'md' ? 'text-sm px-3 py-1' : ''
    if (paymentStatus === 'pending_payment') {
      return <Badge variant="secondary" className={`bg-yellow-100 text-yellow-800 ${baseClasses}`}>Awaiting Payment</Badge>
    }
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className={`bg-blue-100 text-blue-800 ${baseClasses}`}>Under Review</Badge>
      case 'approved':
        return <Badge variant="secondary" className={`bg-green-100 text-green-800 ${baseClasses}`}>Approved</Badge>
      case 'declined':
        return <Badge variant="secondary" className={`bg-red-100 text-red-800 ${baseClasses}`}>Declined</Badge>
      default:
        return <Badge variant="secondary" className={baseClasses}>{status}</Badge>
    }
  }

  const getTypeIcon = (type: string, size: 'sm' | 'lg' = 'sm') => {
    const iconClass = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
    if (type.includes('cert') || type.includes('certificate') || type === 'sick_cert') {
      return <FileText className={iconClass} />
    }
    if (type === 'pathology') {
      return <FlaskConical className={iconClass} />
    }
    if (type === 'referral') {
      return <Stethoscope className={iconClass} />
    }
    return <Pill className={iconClass} />
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sick_cert':
        return 'Medical Certificate'
      case 'prescription':
        return 'Prescription'
      case 'pathology':
        return 'Pathology Request'
      case 'referral':
        return 'Specialist Referral'
      default:
        return type.replace(/_/g, ' ')
    }
  }

  const getTypeColor = (type: string) => {
    if (type.includes('cert') || type === 'sick_cert') return 'teal'
    if (type === 'pathology') return 'rose'
    if (type === 'referral') return 'amber'
    return 'purple'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'declined':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm">
        <div className="w-8 h-8 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

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
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <span className="hidden sm:inline font-medium text-slate-700">
                {profile?.first_name || profile?.full_name?.split(' ')[0]}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-slate-900">
            Hey, {profile?.first_name || profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500">
            What do you need help with today?
          </p>
        </motion.div>

        {/* Quick Actions - Staggered */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Link href="/start?service=sick_cert">
              <Card className="h-full cursor-pointer border-2 border-slate-100 hover:border-teal-200 hover:shadow-md transition-all duration-200">
                <CardContent className="p-5">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">Medical Certificate</h3>
                  <p className="text-xs text-slate-500">Work, uni & carer&apos;s leave</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Link href="/start?service=prescription">
              <Card className="h-full cursor-pointer border-2 border-slate-100 hover:border-teal-200 hover:shadow-md transition-all duration-200">
                <CardContent className="p-5">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                    <Pill className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">Prescription</h3>
                  <p className="text-xs text-slate-500">Repeat scripts</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href="/start?service=pathology">
              <Card className="h-full cursor-pointer border-2 border-slate-100 hover:border-teal-200 hover:shadow-md transition-all duration-200">
                <CardContent className="p-5">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
                    <FlaskConical className="w-5 h-5 text-rose-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">Pathology</h3>
                  <p className="text-xs text-slate-500">Blood tests & scans</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href="/start?service=referral">
              <Card className="h-full cursor-pointer border-2 border-slate-100 hover:border-teal-200 hover:shadow-md transition-all duration-200">
                <CardContent className="p-5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                    <Stethoscope className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">Specialist Referral</h3>
                  <p className="text-xs text-slate-500">All specialists</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {/* Recent Requests */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.2 }}
        >
          <Card className="border-2 border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900">Your requests</CardTitle>
              <Link href="/start">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 h-9">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New request
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.4 }}
                  >
                    <span className="text-3xl">☀️</span>
                  </motion.div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">No requests yet</h3>
                  <p className="text-sm text-slate-500 mb-5">Stay healthy! When you need us, we&apos;re here.</p>
                  <Link href="/start">
                    <Button className="bg-teal-600 hover:bg-teal-700">
                      Make your first request
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <motion.div 
                  className="space-y-2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {requests.map((request) => (
                    <motion.div
                      key={request.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
                      variants={itemVariants}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                        {getTypeIcon(request.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">
                          {getTypeLabel(request.type)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.priority_review && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            Priority
                          </Badge>
                        )}
                        {getStatusBadge(request.status, request.payment_status)}
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Request Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedRequest && (
                <>
                  <div className={`w-10 h-10 rounded-xl bg-${getTypeColor(selectedRequest.type)}-50 flex items-center justify-center`}>
                    {getTypeIcon(selectedRequest.type, 'lg')}
                  </div>
                  <div>
                    <span className="block">{selectedRequest && getTypeLabel(selectedRequest.type)}</span>
                    <span className="text-sm font-normal text-slate-500">
                      Request #{selectedRequest?.id.slice(0, 8)}
                    </span>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 pt-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedRequest.status)}
                  {getStatusBadge(selectedRequest.status, selectedRequest.payment_status, 'md')}
                </div>
              </div>
              
              <Separator />
              
              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Submitted
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {format(new Date(selectedRequest.created_at), 'dd MMM yyyy, h:mm a')}
                  </span>
                </div>
                
                {selectedRequest.start_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Certificate start date
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {format(new Date(selectedRequest.start_date), 'dd MMM yyyy')}
                      {selectedRequest.backdated && (
                        <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 text-xs">
                          Backdated
                        </Badge>
                      )}
                    </span>
                  </div>
                )}
                
                {selectedRequest.priority_review && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Priority review
                    </span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      Yes
                    </Badge>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Status-specific content */}
              {selectedRequest.status === 'pending' && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 text-sm">Under review</p>
                      <p className="text-sm text-blue-600 mt-1">
                        A doctor is reviewing your request. You&apos;ll receive an email once it&apos;s complete.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedRequest.status === 'approved' && (
                <div className="space-y-3">
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800 text-sm">Approved!</p>
                        <p className="text-sm text-green-600 mt-1">
                          Your document has been sent to your email.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" size="sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Resend email
                    </Button>
                    <Button className="flex-1 bg-teal-600 hover:bg-teal-700" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedRequest.status === 'declined' && (
                <div className="space-y-3">
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 text-sm">Request declined</p>
                        <p className="text-sm text-red-600 mt-1">
                          Unfortunately, we couldn&apos;t approve this request. Please check your email for details.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm" onClick={() => {
                    setSelectedRequest(null)
                    router.push('/contact')
                  }}>
                    Contact support
                  </Button>
                </div>
              )}
              
              {/* Help text */}
              <p className="text-xs text-slate-400 text-center">
                Need help?{' '}
                <Link href="/contact" className="text-teal-600 hover:text-teal-700 underline underline-offset-2">
                  Contact support
                </Link>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
