'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  LogOut
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

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
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {profile?.first_name || profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            View and manage your medical certificate and prescription requests
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link href="/start?service=sick_cert">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Medical Certificate</h3>
                  <p className="text-sm text-muted-foreground">For sick leave or uni</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/start?service=prescription">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Pill className="w-6 h-6 text-purple-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Prescription</h3>
                  <p className="text-sm text-muted-foreground">Renew your medications</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Requests</CardTitle>
            <Link href="/start">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">You haven&apos;t made any requests yet</p>
                <Link href="/start">
                  <Button>Make Your First Request</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-4 py-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

