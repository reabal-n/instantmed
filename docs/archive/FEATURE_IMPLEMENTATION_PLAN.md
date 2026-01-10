# Feature Implementation Plan - InstantMed
**Date:** January 5, 2026  
**Status:** In Progress

## Overview
Implementing 4 major feature enhancements to improve the intake flow and user experience.

---

## Feature 1: Fix Back Button Issues ✅ PRIORITY 1

### Problem:
Back button in intake flows not functioning correctly.

### Solution:
- Audit all flow components for navigation issues
- Implement proper router.back() or goBack() handlers
- Ensure state preservation when navigating back
- Add loading states during navigation

### Files to Fix:
- `components/intake/enhanced-intake-flow.tsx`
- `app/consult/request/consult-flow-client.tsx`
- `app/request/unified-flow-client.tsx`

### Implementation:
```tsx
// Proper back button handler
const handleBack = () => {
  if (currentStep === 0) {
    router.push('/') // Go home if at first step
  } else {
    setStep(steps[currentIndex - 1]) // Go to previous step
  }
}
```

---

## Feature 2: Medication Database Search 🔍 PRIORITY 2

### Requirements:
- Searchable autocomplete for medication names
- Support for both repeat and new prescriptions
- Display medication details (strength, common uses)
- Australian medication database

### Components to Create:
1. `components/medication/medication-search.tsx` - Autocomplete component
2. `lib/data/medications.ts` - Medication database
3. `components/medication/medication-card.tsx` - Display selected medication

### Medication Database Structure:
```tsx
interface Medication {
  id: string
  name: string
  genericName?: string
  brandNames?: string[]
  strengths: string[]
  category: string
  commonUses: string[]
  requiresCall?: boolean
  schedule?: number // S4, S8 etc
}
```

### Common Australian Medications to Include:
- Metformin (diabetes)
- Atorvastatin (cholesterol)
- Levothyroxine (thyroid)
- Salbutamol (asthma)
- Sertraline (mental health)
- Esomeprazole (reflux)
- And ~100 more common medications

### Integration Points:
- Enhanced intake flow (new prescriptions)
- Repeat prescription flow
- General consult flow

---

## Feature 3: Consultation Type Branching 🔀 PRIORITY 3

### Requirements:
Add consultation type selector with specialized pathways for:
- Men's Health
- Women's Health
- Weight Loss
- Mental Health
- Skin Conditions
- Sexual Health
- General Health Issue
- New Prescription

### Flow Structure:
```
General Consult Selected
    ↓
What type of consultation? (NEW STEP)
    ↓
    ├── Men's Health → Specific questions (ED, hair loss, etc.)
    ├── Women's Health → Specific questions (contraception, UTI, etc.)
    ├── Weight Loss → Specific questions (current weight, goals, etc.)
    ├── Mental Health → Specific questions (symptoms, history, etc.)
    ├── Skin Conditions → Specific questions (acne, eczema, etc.)
    ├── Sexual Health → Specific questions (STI, concerns, etc.)
    ├── New Prescription → Medication search + indication
    └── General → Standard intake questions
```

### Implementation:
- Add consultation type selection step
- Create specialized question sets for each type
- Branch logic based on selected type
- Appropriate doctor routing

---

## Feature 4: Pop-out Intake Flows 📱 PRIORITY 4

### Requirements:
Open intake forms in overlay modal/drawer instead of full page navigation.

### Design:
- Full-screen modal on mobile
- Drawer panel on desktop (sliding from right)
- Persistent background (dimmed)
- Smooth transitions
- Escape key to close
- Confirm before closing if form has data

### Components to Create:
1. `components/flow/intake-modal.tsx` - Modal wrapper
2. `components/flow/intake-drawer.tsx` - Drawer wrapper
3. Use existing DrawerPanel component

### Implementation Approach:
```tsx
// Instead of:
<Link href="/medical-certificate/request">

// Use:
<button onClick={() => openIntakeModal('medical-certificate')}>
```

### Features:
- Preserves page context
- Better mobile UX
- Faster perceived performance
- Can return to previous page easily

---

## Implementation Timeline

### Phase 1: Back Button Fix (30 min)
- [x] Identify broken navigation handlers
- [ ] Implement proper back navigation
- [ ] Test across all flows
- [ ] Add loading states

### Phase 2: Medication Search (90 min)
- [ ] Create medication database (100+ entries)
- [ ] Build autocomplete component
- [ ] Add medication details display
- [ ] Integrate into flows
- [ ] Test search functionality

### Phase 3: Consultation Branching (60 min)
- [ ] Design consultation type selector
- [ ] Create specialized question sets
- [ ] Implement branching logic
- [ ] Update routing
- [ ] Test all pathways

### Phase 4: Pop-out Flows (45 min)
- [ ] Create modal/drawer components
- [ ] Update service cards to open modals
- [ ] Implement close confirmation
- [ ] Add smooth transitions
- [ ] Test responsive behavior

### Total Estimated Time: 3-4 hours

---

## Testing Checklist

### Functionality:
- [ ] Back button works from any step
- [ ] Medication search returns relevant results
- [ ] Each consultation type shows correct questions
- [ ] Pop-out modals open/close smoothly
- [ ] Form data persists during navigation
- [ ] All flows complete successfully

### UX:
- [ ] Clear navigation indicators
- [ ] Helpful error messages
- [ ] Loading states visible
- [ ] Responsive on all devices
- [ ] Keyboard navigation works

### Edge Cases:
- [ ] Empty search results
- [ ] Network errors
- [ ] Invalid medication names
- [ ] Incomplete form data
- [ ] Browser back button behavior

---

## Success Criteria

### Back Button:
✅ Users can navigate back without losing data  
✅ Clear indication of current step  
✅ Smooth transitions

### Medication Search:
✅ Fast, accurate search results  
✅ Easy to select medication  
✅ Clear medication information  
✅ Works for both repeat and new prescriptions

### Consultation Branching:
✅ Clear consultation type options  
✅ Relevant questions for each type  
✅ Smooth branching experience  
✅ Appropriate doctor matching

### Pop-out Flows:
✅ Smooth modal/drawer animations  
✅ Easy to close (with confirmation)  
✅ Responsive on mobile and desktop  
✅ Better UX than full page navigation

---

## Next Steps

1. Start with back button fixes (quick win)
2. Build medication database and search
3. Implement consultation type branching
4. Add pop-out modal functionality
5. Comprehensive testing
6. Deploy to staging
7. User testing
8. Production deployment

**Status:** Ready to implement  
**Priority:** HIGH  
**Dependencies:** None
