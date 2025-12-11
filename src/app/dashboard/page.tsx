'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
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
  LogOut
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
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
  created_at: string
}

interface Profile {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

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
        setProfile(profileData)

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

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'pending_payment') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Awaiting Payment</Badge>
    }
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Under Review</Badge>
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
      return <FileText className="w-5 h-5" />
    }
    return <Pill className="w-5 h-5" />
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">InstantMed</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">
                {profile?.full_name || `${profile?.first_name} ${profile?.last_name}`}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Welcome */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
            Welcome back, {profile?.first_name || profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            View and manage your medical certificate and prescription requests
          </p>
        </motion.div>

        {/* Quick Actions - Staggered */}
        <motion.div 
          className="grid md:grid-cols-2 gap-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Link href="/start?service=sick_cert">
              <Card className="h-full cursor-pointer border-slate-100 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_1px_oklch(0.55_0.15_185_/_0.1)] hover:border-teal-500/20">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center border border-teal-100">
                    <FileText className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Medical Certificate</h3>
                    <p className="text-sm text-muted-foreground">For sick leave or uni</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Link href="/start?service=prescription">
              <Card className="h-full cursor-pointer border-slate-100 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_1px_oklch(0.55_0.15_185_/_0.1)] hover:border-teal-500/20">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
                    <Pill className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Prescription</h3>
                    <p className="text-sm text-muted-foreground">Renew your medications</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {/* Recent Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        >
          <Card className="border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="tracking-tight">Your Requests</CardTitle>
              <Link href="/start">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <motion.div 
                  className="text-center py-16"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {/* Friendly empty state with emoji */}
                  <motion.div
                    className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6 border border-amber-100"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
                  >
                    <span className="text-4xl">☀️</span>
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-2 tracking-tight">No records yet</h3>
                  <p className="text-muted-foreground mb-6">Stay healthy! When you need us, we&apos;re here.</p>
                  <Link href="/start">
                    <Button className="bg-teal-600 hover:bg-teal-700 animate-pulse-cta">
                      Make Your First Request
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <motion.div 
                  className="divide-y divide-slate-100"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {requests.map((request, index) => (
                    <motion.div
                      key={request.id}
                      className="flex items-center gap-4 py-4 hover:bg-slate-50/50 -mx-2 px-2 rounded-lg transition-colors"
                      variants={itemVariants}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        {getTypeIcon(request.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize truncate">
                          {request.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(request.status)}
                        {getStatusBadge(request.status, request.payment_status)}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}

