# Panel-Based System Implementation Guide

## ✅ Phase 1: Foundation (COMPLETE)

## ✅ Phase 2: Shell Components (COMPLETE)

### What Was Built

#### 1. **Panel System Components** (`components/panels/`)
- **PanelProvider** - Context-based panel stack manager (only one panel active at a time)
- **SessionPanel** - Main content panels for linear flows (med cert, consultations)
- **DrawerPanel** - Side panels for details and quick actions (400px default)
- **SheetPanel** - Full-height panels for complex forms (640px default)

#### 2. **Motion System** (`lib/motion/panel-variants.ts`)
- Smooth, calm animations (300-400ms)
- Custom ease-out curves: `[0.16, 1, 0.3, 1]`
- Backdrop fades to 40% opacity
- Panels slide + fade gently into view
- No snapping, bouncing, or dramatic easing

#### 3. **Microcopy System** (`lib/microcopy/`)
- **Error Messages** - Human, blame-free error handling
- **Feedback Messages** - Status updates with optional emojis
- **Button Copy** - Clear, boring, verb-first actions
- All designed for 2am anxiety-free usage

---

## 🎯 How to Use

### Basic Panel Usage

```tsx
import { PanelProvider, usePanel, SessionPanel } from '@/components/panels'

// 1. Wrap your app with PanelProvider (in layout)
function App() {
  return (
    <PanelProvider>
      {children}
    </PanelProvider>
  )
}

// 2. Open a panel from anywhere
function Dashboard() {
  const { openPanel } = usePanel()
  
  const handleNewRequest = () => {
    openPanel({
      id: 'new-med-cert',
      type: 'session',
      component: (
        <SessionPanel maxWidth="md">
          <MedCertFlow />
        </SessionPanel>
      )
    })
  }
  
  return <button onClick={handleNewRequest}>New Request</button>
}
```

### SessionPanel - For Flows

```tsx
<SessionPanel 
  maxWidth="md" // sm, md, lg, xl
  preventBackdropClose={true} // during payment, etc
  showCloseButton={true}
  onClose={() => console.log('Panel closing')}
>
  <div className="p-8">
    <h1>Medical Certificate Request</h1>
    {/* Your flow content */}
  </div>
</SessionPanel>
```

### DrawerPanel - For Details

```tsx
<DrawerPanel 
  side="right" // or "left"
  width={400}
  title="Request Details"
  onClose={handleClose}
>
  <div className="p-6">
    {/* Request details, actions */}
  </div>
</DrawerPanel>
```

### SheetPanel - For Settings

```tsx
<SheetPanel 
  width={640}
  title="Profile Settings"
  description="Manage your account details"
  onClose={handleClose}
>
  {/* Multi-section form */}
</SheetPanel>
```

### Using Microcopy

```tsx
import { ERROR_MESSAGES, FEEDBACK_MESSAGES, BUTTON_COPY } from '@/lib/microcopy'

// Error handling
if (!email) {
  setError(ERROR_MESSAGES.requiredField)
}

// Status feedback
toast.success(FEEDBACK_MESSAGES.paymentReceived)

// Button labels
<button>{BUTTON_COPY.submit}</button>
```

---

## 📋 Next Steps

### ✅ Phase 2: Shell Components (COMPLETE)

#### What Was Built

**LeftRail** (`components/shell/left-rail.tsx`)
✅ Fixed left navigation (64px collapsed, 240px expanded)
✅ User avatar + name at top
✅ Role-specific nav items (patient/doctor)
✅ "New Request" button for patients
✅ Automatically dims when panel is active
✅ Smooth expand/collapse animation
✅ Active route highlighting

**AuthenticatedShell** (`components/shell/authenticated-shell.tsx`)
✅ Main wrapper for authenticated areas
✅ Contains PanelProvider + LeftRail
✅ Content area offset by rail width
✅ AuthenticatedShellMinimal for onboarding
✅ Replaces marketing navbar after login

**FloatingActionBar** (`components/shell/floating-action-bar.tsx`)
✅ Bottom action bar for bulk operations
✅ Slides up with smooth animation
✅ Shows selection count
✅ Clear/focused actions
✅ FloatingActionBarContent helper component

**SessionProgress** (`components/shell/session-progress.tsx`)
✅ Minimal dot-based progress indicator
✅ Animated progress line
✅ Optional step labels
✅ SessionProgressDots (simpler version)
✅ Accessible with ARIA labels

#### Usage Example

```tsx
// In patient/layout.tsx
import { AuthenticatedShell } from '@/components/shell'
import { usePanel, SessionPanel } from '@/components/panels'

export default function PatientLayout({ children }) {
  const { openPanel } = usePanel()
  
  const handleNewRequest = () => {
    openPanel({
      id: 'new-request',
      type: 'session',
      component: (
        <SessionPanel maxWidth="md">
          <RequestTypeSelector />
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

**Next: Update patient and doctor layouts to use AuthenticatedShell**

### Phase 3: Transform Flows

**Medical Certificate Flow**
1. Open `app/medical-certificate/request/med-cert-flow-client.tsx`
2. Wrap entire flow in SessionPanel
3. Replace full-page navigation with panel steps
4. Update progress indicator to floating dots
5. Replace copy with microcopy system

**Consultation Flow**
- Same treatment as med cert flow
- Linear progression in SessionPanel
- Gentle progress cues
- Human language throughout

### Phase 4: Transform Dashboards

**Patient Dashboard**
- Remove tabs → single scroll with sections
- Request cards (not table rows)
- Click card → opens DrawerPanel
- "New Request" → opens SessionPanel
- Settings → opens SheetPanel

**Doctor Dashboard**
- Request queue as cards (not table)
- Click request → opens DrawerPanel with inline actions
- Approve/reject directly in drawer
- Floating action bar for bulk operations

---

## 🎨 Design Principles Reference

### Visual Personality
- Soft, modern, premium, calm
- Everything feels gently floating
- Off-white and warm neutrals
- Light blue, sky tints, soft lavender accents
- No harsh borders or sharp contrasts

### Motion Philosophy
- Smooth: 300-400ms transitions
- Ease-out curves for entering
- Ease-in for exiting
- Never snaps, bounces, or jumps
- Motion communicates control and competence

### Copy Tone
- Calm. Confident. Human.
- Short sentences.
- Verb-first.
- One idea per line.
- No hype language
- Pass the "2am anxiety test"

### Absolute NOs
- 🚀🔥✨ (hype emojis)
- "Awesome!" "Let's do this"
- Marketing/startup tone
- Error codes
- Blame language
- Uppercase shouting

---

## 📁 File Structure Created

```
components/
├── panels/
│   ├── panel-provider.tsx ✅
│   ├── session-panel.tsx ✅
│   ├── drawer-panel.tsx ✅
│   ├── sheet-panel.tsx ✅
│   └── index.ts ✅
│
├── shell/
│   ├── left-rail.tsx ✅
│   ├── authenticated-shell.tsx ✅
│   ├── floating-action-bar.tsx ✅
│   ├── session-progress.tsx ✅
│   └── index.ts ✅

lib/
├── motion/
│   └── panel-variants.ts ✅
│
├── microcopy/
│   ├── errors.ts ✅
│   ├── feedback.ts ✅
│   ├── buttons.ts ✅
│   └── index.ts ✅
```

---

## 🚀 Quick Start Examples

### Example 1: Convert Existing Flow to Panel

**Before** (full-page flow):
```tsx
export default function MedCertPage() {
  return (
    <div className="min-h-screen">
      <MedCertFlow />
    </div>
  )
}
```

**After** (panel-based):
```tsx
// In dashboard
function Dashboard() {
  const { openPanel } = usePanel()
  
  return (
    <button onClick={() => openPanel({
      id: 'med-cert-flow',
      type: 'session',
      component: (
        <SessionPanel maxWidth="md">
          <MedCertFlow />
        </SessionPanel>
      )
    })}>
      New Medical Certificate
    </button>
  )
}
```

### Example 2: Request Details Drawer

```tsx
function RequestCard({ request }) {
  const { openPanel } = usePanel()
  
  const handleViewDetails = () => {
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
    <div onClick={handleViewDetails} className="cursor-pointer">
      {/* Request card content */}
    </div>
  )
}
```

---

## 🎯 Success Criteria

A successful panel-based interface should:

✅ Feel like guided consultation, not browsing  
✅ One primary panel at a time  
✅ Background remains visible but dimmed  
✅ Never surprise-close panels  
✅ All transitions feel smooth and confident  
✅ Copy passes the "2am anxiety test"  
✅ Zero marketing/hype language  
✅ Clear where user is, what's next, and can review before submitting  

---

## 💡 Tips

1. **Use SessionPanel for** multi-step flows, consultations, anything finite
2. **Use DrawerPanel for** quick details, single actions, previews
3. **Use SheetPanel for** settings, complex forms, multi-section content
4. **Test at 2am** - would this feel calming if you were anxious?
5. **Keep panels focused** - one task per panel
6. **Progressive disclosure** - don't overwhelm with all options at once

---

## 🆘 Common Patterns

### Opening a Panel from Button
```tsx
const { openPanel } = usePanel()

<Button onClick={() => openPanel({
  id: 'unique-id',
  type: 'session', // or 'drawer', 'sheet'
  component: <SessionPanel>Content</SessionPanel>
})}>
  Open Panel
</Button>
```

### Closing a Panel
```tsx
const { closePanel } = usePanel()

// Panel closes automatically when backdrop clicked (unless preventBackdropClose)
// Or close programmatically:
<Button onClick={closePanel}>Done</Button>
```

### Panel with Callback
```tsx
openPanel({
  id: 'confirm-action',
  type: 'session',
  component: <SessionPanel>...</SessionPanel>,
  onClose: () => {
    console.log('Panel was closed')
    // Cleanup, refresh data, etc
  }
})
```

---

## 📞 Need Help?

This is a foundational system. The patterns are simple:
1. Wrap app in PanelProvider
2. Use `openPanel()` to open panels
3. Panels handle their own close behavior
4. Use microcopy for all user-facing text

**Next focus:** Build the LeftRail and AuthenticatedShell to complete the authenticated experience.
