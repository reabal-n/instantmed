# What's Next: Testing & Rollout Guide

## ✅ What Just Happened

**Your patient area now uses the panel-based system!**

Changes made:
1. ✅ Created `app/patient/patient-shell.tsx` - Client component wrapper
2. ✅ Updated `app/patient/layout.tsx` - Now uses `PatientShell` instead of Navbar/Sidebar/Dock
3. ✅ All patient pages now have:
   - Left rail navigation
   - "New Request" button that opens service selector
   - Panel-based architecture

---

## 🧪 Test It Now

### 1. Start Your Dev Server
```bash
npm run dev
```

### 2. Visit Patient Area
Navigate to: `http://localhost:3000/patient`

**Expected behavior:**
- ✅ Left rail appears on left side (InstantMed logo at top)
- ✅ User avatar + name displayed
- ✅ Navigation items (Overview, My Requests, Documents, Settings)
- ✅ Green "New Request" button prominent in rail
- ✅ Main content area offset to accommodate rail

### 3. Test "New Request" Button
Click the green "New Request" button

**Expected behavior:**
- ✅ Background dims to 40% opacity
- ✅ Service selector panel slides in smoothly from center
- ✅ Shows 3 service cards:
  - Medical Certificate (blue)
  - Prescription (green)  
  - General Consultation (purple)
- ✅ Clicking a service navigates to that flow
- ✅ Clicking backdrop closes panel
- ✅ ESC key closes panel

### 4. Test Navigation
Click nav items in left rail

**Expected behavior:**
- ✅ Active route highlighted in primary color
- ✅ Page changes, rail remains visible
- ✅ Smooth transitions

### 5. Test Rail Collapse
Click the collapse arrow in rail header

**Expected behavior:**
- ✅ Rail smoothly animates to 64px width
- ✅ Icons remain visible
- ✅ Text hides
- ✅ Content area expands
- ✅ Click again to expand back

---

## 🐛 Common Issues & Fixes

### Issue: Nothing appears / Blank page
**Cause:** Build error or component import issue  
**Fix:**
```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run dev
```

### Issue: "Cannot find module @heroui/react"
**Cause:** Missing dependency  
**Fix:**
```bash
npm install @heroui/react
```

### Issue: Panel doesn't open
**Cause:** PanelProvider not wrapping content  
**Fix:** Check that `AuthenticatedShell` is being used (it includes PanelProvider)

### Issue: Left rail covers content
**Cause:** Z-index conflict  
**Fix:** Rail is z-40, panels are z-50. Check your main content doesn't have higher z-index.

### Issue: TypeScript errors
**Cause:** Missing type definitions  
**Fix:**
```bash
npm install --save-dev @types/react @types/node
```

---

## 📋 Next Steps (Priority Order)

### **Immediate (Do This Week)**

#### 1. Test All Patient Pages
Visit each patient route and ensure left rail persists:
- [ ] `/patient` - Dashboard
- [ ] `/patient/requests` - Request history
- [ ] `/patient/documents` - Documents
- [ ] `/patient/settings` - Settings

**Each should:**
- Show left rail
- Display content properly
- "New Request" button works

#### 2. Update Patient Dashboard (`app/patient/page.tsx`)
Transform from tabs to single-scroll with panels:

```tsx
// app/patient/page.tsx
'use client'

import { usePanel, DrawerPanel } from '@/components/panels'

export function PatientDashboardPage({ requests }) {
  const { openPanel } = usePanel()

  const handleViewRequest = (request) => {
    openPanel({
      id: `request-${request.id}`,
      type: 'drawer',
      component: (
        <DrawerPanel title="Request Details" width={450}>
          <RequestDetails request={request} />
        </DrawerPanel>
      )
    })
  }

  return (
    <div className="space-y-8">
      {/* Remove tabs, make single scroll */}
      <section>
        <h2>Recent Requests</h2>
        {requests.map(r => (
          <RequestCard 
            key={r.id} 
            onClick={() => handleViewRequest(r)} 
          />
        ))}
      </section>
    </div>
  )
}
```

#### 3. Create Request Card Component
**File:** `components/patient/request-card.tsx`

```tsx
'use client'

interface RequestCardProps {
  request: {
    id: string
    type: string
    status: string
    created_at: string
  }
  onClick: () => void
}

export function RequestCard({ request, onClick }: RequestCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-6 bg-white rounded-xl border border-gray-200 
                 hover:shadow-lg transition-all text-left"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{request.type}</h3>
          <p className="text-sm text-gray-600">{request.status}</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date(request.created_at).toLocaleDateString()}
        </div>
      </div>
    </button>
  )
}
```

### **This Week**

#### 4. Transform Medical Certificate Flow
**File:** `app/medical-certificate/request/med-cert-flow-client.tsx`

Add progress indicator and update copy:

```tsx
import { SessionProgress } from '@/components/shell'
import { ERROR_MESSAGES, BUTTON_COPY } from '@/lib/microcopy'

// Add at top of flow render
<SessionProgress 
  currentStep={currentStep} 
  totalSteps={totalSteps}
  stepLabel={currentStepLabel}
  className="mb-8"
/>

// Replace button text
<button>{BUTTON_COPY.continue}</button>
<button>{BUTTON_COPY.back}</button>

// Replace error messages
setError(ERROR_MESSAGES.requiredField)
```

### **Next Week**

#### 5. Update Doctor Dashboard
Similar transformation for doctor area:
- Create `app/doctor/doctor-shell.tsx`
- Update `app/doctor/dashboard/page.tsx` layout
- Add `FloatingActionBar` for bulk actions
- Use `DrawerPanel` for request details

#### 6. Replace All Copy
Search and replace throughout codebase:
- "Submit" → `BUTTON_COPY.submit`
- "Invalid" errors → `ERROR_MESSAGES.*`
- "Success!" → `FEEDBACK_MESSAGES.*`

---

## 📊 Rollout Strategy

### Week 1: Patient Area (Current)
- ✅ Patient layout updated
- [ ] Test all patient pages
- [ ] Transform patient dashboard
- [ ] Add request detail drawer

### Week 2: Flows
- [ ] Med cert flow → SessionPanel + progress
- [ ] Consultation flow → SessionPanel + progress
- [ ] Update all flow copy with microcopy

### Week 3: Doctor Area
- [ ] Doctor layout → AuthenticatedShell
- [ ] Doctor dashboard → Card grid + DrawerPanels
- [ ] Bulk actions → FloatingActionBar

### Week 4: Polish
- [ ] Visual refinements
- [ ] Animation tuning
- [ ] Full copy audit

---

## 🎯 Success Metrics

After full rollout, measure:
- [ ] Task completion rate increases
- [ ] Support tickets decrease (fewer confused users)
- [ ] Session duration decreases (faster task completion)
- [ ] User feedback improves (qualitative)

---

## 📞 Need Help?

**Reference Documentation:**
- `PANEL_SYSTEM_IMPLEMENTATION.md` - Complete system reference
- `INTEGRATION_GUIDE.md` - Step-by-step integration
- `lib/microcopy/` - All copy standards

**Test the System:**
1. Visit `/patient` after starting dev server
2. Click "New Request" button
3. Watch panel slide in smoothly
4. Select a service
5. Background should stay visible but dimmed

**Everything working?** → Continue to next step (transform dashboard)  
**Something broken?** → Check Common Issues section above

---

## 🚀 You're Ready!

The foundation is solid. The patient area is now panel-based. Test it, then roll out to the rest of the app step by step.

**Current Status:**
- ✅ Panel system built
- ✅ Shell components built
- ✅ Microcopy system built
- ✅ Patient layout transformed
- ⏳ Patient dashboard (next)
- ⏳ Flows transformation (next)
- ⏳ Doctor area (next)

Start your dev server and see the new patient experience in action! 🎉
