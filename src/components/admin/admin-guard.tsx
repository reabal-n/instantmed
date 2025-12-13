'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminGuardProps {
  children: React.ReactNode
  fallbackPath?: string
  requiredRole?: 'admin' | 'doctor'
}

export function AdminGuard({
  children,
  fallbackPath = '/',
  requiredRole = 'admin',
}: AdminGuardProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuthorization = async () => {
      const supabase = createClient()
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setIsAuthorized(false)
          setIsLoading(false)
          return
        }

        // Get profile with role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, can_approve_high_risk')
          .eq('auth_user_id', user.id)
          .single()

        if (error || !profile) {
          console.error('Failed to get profile:', error)
          setIsAuthorized(false)
          setIsLoading(false)
          return
        }

        // Check role authorization
        const hasRequiredRole = requiredRole === 'admin' 
          ? profile.role === 'admin'
          : profile.role === 'admin' || profile.role === 'doctor'

        setIsAuthorized(hasRequiredRole)
      } catch (err) {
        console.error('Auth check failed:', err)
        setIsAuthorized(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [requiredRole])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-4 text-slate-600">Checking authorization...</p>
        </div>
      </div>
    )
  }

  // Unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Access Denied
          </h1>
          <p className="text-slate-600 mb-6">
            You don&apos;t have permission to access this area. This page requires {requiredRole} privileges.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push(fallbackPath)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Sign in with different account
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Authorized - render children
  return <>{children}</>
}

// Server-side admin check utility
export async function checkAdminAccess(supabase: any): Promise<{
  isAuthorized: boolean
  userId?: string
  role?: string
  error?: string
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { isAuthorized: false, error: 'Not authenticated' }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (error || !profile) {
      return { isAuthorized: false, error: 'Profile not found' }
    }

    if (profile.role !== 'admin') {
      return { 
        isAuthorized: false, 
        userId: user.id, 
        role: profile.role,
        error: 'Insufficient permissions'
      }
    }

    return { 
      isAuthorized: true, 
      userId: user.id, 
      role: profile.role 
    }
  } catch (err) {
    return { isAuthorized: false, error: 'Authorization check failed' }
  }
}
