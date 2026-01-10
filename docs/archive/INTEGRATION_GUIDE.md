# Panel System Integration Guide

## 🚀 Quick Start Checklist

- [ ] **Step 1:** Update patient layout to use `AuthenticatedShell`
- [ ] **Step 2:** Update doctor layout to use `AuthenticatedShell`
- [ ] **Step 3:** Create service selector modal
- [ ] **Step 4:** Transform medical certificate flow
- [ ] **Step 5:** Transform consultation flow
- [ ] **Step 6:** Update patient dashboard
- [ ] **Step 7:** Update doctor dashboard
- [ ] **Step 8:** Replace copy with microcopy system

---

## Step 1: Update Patient Layout

**File:** `app/patient/layout.tsx`

### Current Pattern (Full-page with navbar)
```tsx
export default async function PatientLayout({ children }) {
  return (
    <div>
      <Navbar />
      {children}
      <Footer />
    </div>
  )
}
```

### New Pattern (Panel-based with left rail)
```tsx
import { getAuthenticatedUserWithProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PatientShell } from './patient-shell' // Create this client component

export default async function PatientLayout({ children }) {
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    redirect('/sign-in')
  }
  
  if (!authUser.profile.onboarding_completed) {
    redirect('/patient/onboarding')
  }

  return (
    <PatientShell 
      user={{
        id: authUser.profile.id,
        name: authUser.profile.full_name,
        email: authUser.user.email,
        avatar: authUser.user.user_metadata?.avatar_url
      }}
    >
      {children}
    </PatientShell>
  )
}
```

### Create Client Component
**File:** `app/patient/patient-shell.tsx`

```tsx
'use client'

import { type ReactNode } from 'react'
import { AuthenticatedShell } from '@/components/shell'
import { usePanel, SessionPanel } from '@/components/panels'
import { ServiceSelector } from '@/components/patient/service-selector'
import { MedCertFlowClient } from '@/app/medical-certificate/request/med-cert-flow-client'
import { ConsultFlowClient } from '@/app/consult/request/consult-flow-client'

interface PatientShellProps {
  children: ReactNode
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}

export function PatientShell({ children, user }: PatientShellProps) {
  const { openPanel, closePanel } = usePanel()

  const handleNewRequest = () => {
    // Open service selector
    openPanel({
      id: 'service-selector',
      type: 'session',
      component: (
        <SessionPanel maxWidth="md">
          <ServiceSelector
            onSelectService={(service) => {
              if (service === 'medical-certificate') {
                // Close selector, open med cert flow
                openPanel({
                  id: 'med-cert-flow',
                  type: 'session',
                  component: (
                    <SessionPanel maxWidth="md" preventBackdropClose={true}>
                      <MedCertFlowClient
                        patientId={user.id}
                        isAuthenticated={true}
                        needsOnboarding={false}
                        userEmail={user.email}
                        userName={user.name}
                      />
                    </SessionPanel>
                  )
                })
              } else if (service === 'consultation') {
                openPanel({
                  id: 'consult-flow',
                  type: 'session',
                  component: (
                    <SessionPanel maxWidth="md" preventBackdropClose={true}>
                      <ConsultFlowClient
                        patientId={user.id}
                        isAuthenticated={true}
                        needsOnboarding={false}
                        userEmail={user.email}
                        userName={user.name}
                      />
                    </SessionPanel>
                  )
                })
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
```

---

## Step 2: Update Doctor Layout

**File:** `app/doctor/dashboard/page.tsx`

### Wrap with AuthenticatedShell
```tsx
import { getAuthenticatedUserWithProfile } from '@/lib/auth'
import { DoctorShell } from './doctor-shell'

export default async function DoctorDashboardPage() {
  const authUser = await getAuthenticatedUserWithProfile()
  
  // ... fetch dashboard data ...

  return (
    <DoctorShell
      user={{
        name: authUser.profile.full_name,
        email: authUser.user.email,
        avatar: authUser.user.user_metadata?.avatar_url
      }}
      stats={stats}
      requests={requests}
    />
  )
}
```

**File:** `app/doctor/dashboard/doctor-shell.tsx`

```tsx
'use client'

import { type ReactNode } from 'react'
import { AuthenticatedShell } from '@/components/shell'
import { DoctorDashboard } from './dashboard-content' // Your dashboard component

export function DoctorShell({ user, stats, requests }) {
  return (
    <AuthenticatedShell
      userName={user.name}
      userAvatar={user.avatar}
      userRole="doctor"
      // No onNewRequest for doctors
    >
      <DoctorDashboard stats={stats} requests={requests} />
    </AuthenticatedShell>
  )
}
```

---

## Step 3: Update Patient Dashboard

**File:** `app/patient/page.tsx`

### Transform to Panel-Based

```tsx
'use client'

import { useState } from 'react'
import { usePanel, DrawerPanel } from '@/components/panels'
import { RequestCard } from '@/components/patient/request-card'
import { RequestDetails } from '@/components/patient/request-details'
import { BUTTON_COPY } from '@/lib/microcopy'

export function PatientDashboard({ requests, prescriptions }) {
  const { openPanel } = usePanel()

  const handleViewRequest = (request) => {
    openPanel({
      id: `request-${request.id}`,
      type: 'drawer',
      component: (
        <DrawerPanel 
          title="Request Details" 
          width={450}
        >
          <RequestDetails request={request} />
        </DrawerPanel>
      )
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Remove tabs - single scroll layout */}
      
      {/* Recent Requests Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Recent Requests</h2>
        <div className="grid gap-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onClick={() => handleViewRequest(request)}
            />
          ))}
        </div>
      </section>

      {/* Active Prescriptions Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Active Prescriptions</h2>
        {/* Prescription cards */}
      </section>
    </div>
  )
}
```

---

## Step 4: Update Medical Certificate Flow

**Current:** Full-page flow with step-by-step navigation
**New:** Same flow content, but wrapped in SessionPanel with progress dots

### Minimal Changes Needed

The existing `MedCertFlowClient` component can stay mostly the same. Just:

1. **Remove** the full-page wrapper, header, and footer
2. **Add** SessionProgress at the top
3. **Update** copy with microcopy system

```tsx
// In med-cert-flow-client.tsx
import { SessionProgress } from '@/components/shell'
import { ERROR_MESSAGES, BUTTON_COPY } from '@/lib/microcopy'

export function MedCertFlowClient(props) {
  // ... existing state ...

  return (
    <div className="p-8">
      {/* Add progress indicator */}
      <SessionProgress 
        currentStep={currentStepIndex} 
        totalSteps={STEPS.length}
        stepLabel={STEP_LABELS[step]}
        className="mb-8"
      />

      {/* Existing step content */}
      {renderStep()}

      {/* Footer with actions */}
      <div className="mt-8 flex justify-between">
        {canGoBack && (
          <button onClick={goBack}>{BUTTON_COPY.back}</button>
        )}
        <button onClick={goNext} disabled={!canProceed()}>
          {BUTTON_COPY.continue}
        </button>
      </div>
    </div>
  )
}
```

---

## Step 5: Update Copy Throughout

### Error Messages

**Before:**
```tsx
setError("Invalid email address")
```

**After:**
```tsx
import { ERROR_MESSAGES } from '@/lib/microcopy'
setError(ERROR_MESSAGES.invalidEmail)
// "That doesn't look quite right. Mind checking it once more?"
```

### Button Labels

**Before:**
```tsx
<button>Submit Request</button>
<button>Go Back</button>
```

**After:**
```tsx
import { BUTTON_COPY } from '@/lib/microcopy'
<button>{BUTTON_COPY.submit}</button>  // "Submit for review"
<button>{BUTTON_COPY.back}</button>     // "Back"
```

### Status Messages

**Before:**
```tsx
toast.success("Payment successful!")
```

**After:**
```tsx
import { FEEDBACK_MESSAGES } from '@/lib/microcopy'
toast.success(FEEDBACK_MESSAGES.paymentReceived)  // "Payment received 👍"
```

---

## Step 6: Doctor Dashboard Bulk Actions

**Add FloatingActionBar for multi-select:**

```tsx
import { FloatingActionBar, FloatingActionBarContent } from '@/components/shell'
import { BUTTON_COPY } from '@/lib/microcopy'

export function DoctorDashboard() {
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())

  return (
    <>
      {/* Request cards with selection */}
      <div className="grid gap-4">
        {requests.map(request => (
          <RequestCard
            key={request.id}
            request={request}
            isSelected={selectedRequests.has(request.id)}
            onToggleSelect={() => toggleSelection(request.id)}
          />
        ))}
      </div>

      {/* Floating action bar appears when items selected */}
      <FloatingActionBar isVisible={selectedRequests.size > 0}>
        <FloatingActionBarContent
          label={`${selectedRequests.size} selected`}
          actions={
            <>
              <button onClick={handleBulkApprove}>
                {BUTTON_COPY.approve}
              </button>
              <button onClick={handleBulkReject}>
                {BUTTON_COPY.reject}
              </button>
            </>
          }
          onCancel={() => setSelectedRequests(new Set())}
        />
      </FloatingActionBar>
    </>
  )
}
```

---

## Testing Checklist

After integration:

- [ ] Left rail appears on all patient pages
- [ ] "New Request" button opens service selector panel
- [ ] Service selector opens appropriate flow panel
- [ ] Background dims when panel is active
- [ ] Clicking backdrop closes panel (unless prevented)
- [ ] ESC key closes panel
- [ ] Progress dots animate smoothly
- [ ] All copy uses microcopy system
- [ ] Panels feel calm and floating
- [ ] No surprise-closing of panels
- [ ] Doctor bulk actions show floating bar

---

## Common Issues & Solutions

### Issue: Panel doesn't open
**Solution:** Ensure PanelProvider wraps your content (AuthenticatedShell includes it)

### Issue: Background not dimmed
**Solution:** Check z-index - panels are z-50, backdrop should dim content below

### Issue: Can't use usePanel hook
**Solution:** Must be within PanelProvider. Use AuthenticatedShell in layouts.

### Issue: Multiple panels open at once
**Solution:** This shouldn't happen - PanelProvider enforces one panel. Check implementation.

### Issue: Panel closes unexpectedly
**Solution:** Set `preventBackdropClose={true}` on SessionPanel during critical flows (payment, etc)

---

## Migration Timeline

**Week 1: Foundation**
- ✅ Panel system built
- ✅ Shell components built
- ✅ Microcopy system built

**Week 2: Integration**
- [ ] Update patient layout
- [ ] Update doctor layout
- [ ] Create service selector
- [ ] Test basic panel flows

**Week 3: Transform Flows**
- [ ] Medical certificate → SessionPanel
- [ ] Consultation → SessionPanel
- [ ] Update all copy
- [ ] Add progress indicators

**Week 4: Dashboard Transformation**
- [ ] Patient dashboard panels
- [ ] Doctor dashboard panels
- [ ] Bulk actions
- [ ] Polish & testing

---

## Need Help?

Reference files:
- `PANEL_SYSTEM_IMPLEMENTATION.md` - Complete system documentation
- `EXAMPLE_PATIENT_LAYOUT.tsx` - Patient layout example
- `components/patient/service-selector.tsx` - Service selector component

The system is designed to be **incrementally adoptable**. You can:
1. Start with just patient layout
2. Add doctor layout
3. Transform flows one at a time
4. Update dashboards last

Each step is independent and can be tested separately.
