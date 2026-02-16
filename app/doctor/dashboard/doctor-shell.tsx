'use client'

import { type ReactNode } from 'react'
import { AuthenticatedShell } from '@/components/shell'
import { DoctorMobileNav } from '@/components/ui/mobile-nav'

/**
 * DoctorShell - Wraps all doctor pages with panel system
 * 
 * Includes:
 * - AuthenticatedShell (desktop left rail)
 * - Doctor-specific mobile bottom navigation
 * - Responsive padding for mobile nav
 */

interface DoctorShellProps {
  children: ReactNode
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}

export function DoctorShell({ children, user }: DoctorShellProps) {
  return (
    <AuthenticatedShell
      userName={user.name}
      userAvatar={user.avatar}
      userRole="doctor"
      // No onNewRequest for doctors
    >
      {/* Main content with mobile-optimized padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 md:pb-8">
        {children}
      </div>
      
      {/* Doctor mobile bottom navigation - only shows on mobile */}
      <DoctorMobileNav />
    </AuthenticatedShell>
  )
}
