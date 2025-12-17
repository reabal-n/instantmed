'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Mail,
  Shield,
  FileText,
  Clock,
  CreditCard,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Chip, Spinner, Avatar } from '@heroui/react'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'

interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  role: string
  created_at: string
}

interface RequestSummary {
  id: string
  reference_number: string
  status: string
  service_name: string
  created_at: string
  paid_at?: string
  completed_at?: string
}

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [requests, setRequests] = useState<RequestSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAccountData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login?redirect=/account')
          return
        }

        // Get profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .single()

        if (profileError) throw profileError
        
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          email: user.email || profileData.email,
          phone: profileData.phone,
          role: profileData.role,
          created_at: profileData.created_at,
        })

        // Get recent requests
        const { data: requestsData } = await supabase
          .from('intakes')
          .select(`
            id,
            reference_number,
            status,
            created_at,
            paid_at,
            completed_at,
            services (
              name
            )
          `)
          .eq('patient_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (requestsData) {
          setRequests(requestsData.map((r: { id: string; reference_number: string | null; status: string; services: { name: string }[] | null; created_at: string; paid_at: string | null; completed_at: string | null }) => ({
            id: r.id,
            reference_number: r.reference_number || 'Pending',
            status: r.status,
            service_name: r.services?.[0]?.name || 'Unknown',
            created_at: r.created_at,
            paid_at: r.paid_at ?? undefined,
            completed_at: r.completed_at ?? undefined,
          })))
        }
      } catch (err) {
        console.error('Error loading account:', err)
        setError('Failed to load account data')
      } finally {
        setIsLoading(false)
      }
    }

    loadAccountData()
  }, [supabase, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: "default" | "primary" | "secondary" | "success" | "warning" | "danger"; icon: React.ReactNode }> = {
      draft: { color: 'default', icon: <Clock className="h-3.5 w-3.5" /> },
      pending: { color: 'warning', icon: <Clock className="h-3.5 w-3.5" /> },
      paid: { color: 'primary', icon: <CreditCard className="h-3.5 w-3.5" /> },
      in_review: { color: 'secondary', icon: <FileText className="h-3.5 w-3.5" /> },
      completed: { color: 'success', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      declined: { color: 'danger', icon: <AlertCircle className="h-3.5 w-3.5" /> },
    }
    
    const config = statusConfig[status] || statusConfig.pending
    
    return (
      <Chip 
        color={config.color} 
        variant="flat" 
        size="sm"
        startContent={config.icon}
      >
        {status.replace('_', ' ')}
      </Chip>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar variant="marketing" />
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" color="primary" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar variant="marketing" />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Unable to load account</h1>
            <p className="text-slate-600 mb-4">{error || 'Please try again later'}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="marketing" />
      
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Your Account</h1>
            <p className="mt-2 text-slate-600">Manage your profile and view your requests</p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{profile.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                <Shield className="h-3.5 w-3.5" />
                {profile.role}
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex gap-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/patient/settings">
                  Edit profile
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>

          {/* Recent Requests */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Recent Requests</h3>
              <Button asChild variant="ghost" size="sm">
                <Link href="/patient/requests">
                  View all
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No requests yet</p>
                <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/start">
                    Start a new request
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/patient/requests/${request.id}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{request.service_name}</div>
                        <div className="text-sm text-slate-500">
                          {request.reference_number} • {new Date(request.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(request.status)}
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <Link
              href="/start"
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">New Request</div>
                <div className="text-sm text-slate-500">Start a medical certificate, script, or referral</div>
              </div>
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <div className="font-medium text-slate-900">Contact Support</div>
                <div className="text-sm text-slate-500">Get help with your requests</div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
