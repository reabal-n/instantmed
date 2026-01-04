/**
 * EXAMPLE: Patient Layout with Panel System
 * 
 * This file demonstrates how to integrate AuthenticatedShell
 * into app/patient/layout.tsx
 * 
 * Copy this pattern to your actual patient layout file
 */

'use client'

import { type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AuthenticatedShell } from '@/components/shell'
import { usePanel, SessionPanel } from '@/components/panels'
import { ServiceSelector } from '@/components/patient/service-selector' // You'll need to create this

interface PatientLayoutExampleProps {
  children: ReactNode
  user: {
    name: string
    email: string
    avatar?: string
  }
}

export function PatientLayoutExample({ children, user }: PatientLayoutExampleProps) {
  const { openPanel } = usePanel()
  const router = useRouter()

  const handleNewRequest = () => {
    // Open service selector in a SessionPanel
    openPanel({
      id: 'new-request-selector',
      type: 'session',
      component: (
        <SessionPanel maxWidth="md" preventBackdropClose={false}>
          <ServiceSelector
            onSelectService={(service) => {
              // Close current panel and open the specific service flow
              if (service === 'medical-certificate') {
                openPanel({
                  id: 'med-cert-flow',
                  type: 'session',
                  component: (
                    <SessionPanel maxWidth="md" preventBackdropClose={true}>
                      {/* Import your MedCertFlowClient and render it here */}
                      <div className="p-8">
                        <h1>Medical Certificate Flow</h1>
                        {/* <MedCertFlowClient {...props} /> */}
                      </div>
                    </SessionPanel>
                  )
                })
              } else if (service === 'consultation') {
                // Similar for consultation
                router.push('/consult/request')
              }
            }}
          />
        </SessionPanel>
      )
    })
  }

  return (
    <AuthenticatedShell
      userName={user.name}
      userAvatar={user.avatar}
      userRole="patient"
      onNewRequest={handleNewRequest}
    >
      {children}
    </AuthenticatedShell>
  )
}

/**
 * USAGE IN app/patient/layout.tsx:
 * 
 * import { getAuthenticatedUserWithProfile } from '@/lib/auth'
 * import { PatientLayoutExample } from '@/EXAMPLE_PATIENT_LAYOUT'
 * 
 * export default async function PatientLayout({ children }) {
 *   const authUser = await getAuthenticatedUserWithProfile()
 *   
 *   if (!authUser) {
 *     redirect('/sign-in')
 *   }
 *   
 *   return (
 *     <PatientLayoutExample 
 *       user={{
 *         name: authUser.profile.full_name,
 *         email: authUser.user.email,
 *         avatar: authUser.user.user_metadata?.avatar_url
 *       }}
 *     >
 *       {children}
 *     </PatientLayoutExample>
 *   )
 * }
 */
