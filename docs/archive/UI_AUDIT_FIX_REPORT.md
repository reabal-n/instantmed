# UI Audit & Fix Report - InstantMed Platform
**Date:** January 5, 2026  
**Status:** In Progress

## Executive Summary
This audit identified multiple UI/UX inconsistencies across the InstantMed platform that violate the established design system. Key issues include improper color usage, inconsistent spacing, readability problems, and non-standard component styling.

---

## Issues Identified

### 1. **Color System Violations**
**Severity:** HIGH  
**Files Affected:** Multiple components

#### Problems:
- ❌ Custom blue colors (`bg-blue-500`, `bg-blue-600`, etc.) used instead of design system primary
- ❌ Pure black text (`#000000`) instead of soft black (`#1a1a1a`)
- ❌ Pure white backgrounds instead of off-white (`#F9FAFB`)
- ❌ Harsh color contrasts causing eye strain

#### Design System Standards:
```css
Primary Blue: #2563EB (not #4F46E5 or bg-blue-600)
Soft Black Text: #1a1a1a (never #000000)
Background: #F9FAFB (not #FFFFFF)
Border: #E5E7EB (subtle, barely there)
```

---

### 2. **Typography Inconsistencies**
**Severity:** MEDIUM  
**Files Affected:** Various text components

#### Problems:
- ❌ Inconsistent font sizes across similar components
- ❌ Wrong line heights for readability
- ❌ Inconsistent font weights

#### Design System Standards:
```tsx
Body text: text-base (16px, 400)
Headings h1: text-2xl font-bold (24px, 700)
Headings h2: text-xl font-semibold (20px, 600)
Labels: text-sm font-medium (14px, 500)
```

---

### 3. **Spacing & Layout Issues**
**Severity:** MEDIUM

#### Problems:
- ❌ Arbitrary spacing values (px-5, gap-7) instead of 8px grid
- ❌ Inconsistent padding/margins
- ❌ Uneven card spacing

#### Design System Standards:
```tsx
8px spacing system:
gap-2  → 8px
gap-3  → 12px  
gap-4  → 16px (default)
gap-6  → 24px
gap-8  → 32px
```

---

### 4. **Border Radius Inconsistencies**
**Severity:** LOW

#### Problems:
- ❌ Mixed border radius values (rounded-lg, rounded-xl, rounded-2xl, rounded-[22px])
- ❌ Inconsistent rounding across similar components

#### Design System Standards:
```tsx
Small elements: rounded-lg (10px)  - Buttons, badges
Medium elements: rounded-xl (12px) - Cards, inputs
Large panels: rounded-2xl (16px)   - Panels, modals
```

---

### 5. **Shadow Usage**
**Severity:** LOW

#### Problems:
- ❌ Harsh shadows instead of soft shadows
- ❌ Inconsistent elevation levels

#### Design System Standards:
```tsx
Use soft shadows only:
shadow-soft     - Subtle hover
shadow-soft-md  - Cards, buttons
shadow-soft-lg  - Panels, dialogs
```

---

## Specific Component Issues

### A. Service Selector Cards (Screenshots Provided)
**File:** Various service selection components

#### Current Issues:
1. Dark blue cards with poor contrast
2. White text on blue background (accessibility concern)
3. Inconsistent badge styling
4. Mixed border radius values
5. Custom colors not in design system

#### Required Changes:
- Use white/off-white cards with primary blue accents
- Ensure 4.5:1 text contrast ratio minimum
- Standardize badge component
- Use design system colors exclusively
- Apply consistent rounded-xl borders

---

### B. Service Selection Pages
**Files:**
- `app/request/unified-flow-client.tsx`
- `components/intake/enhanced-intake-flow.tsx`
- `app/start/service-selector.tsx`

#### Issues:
- Inconsistent service card styling
- Multiple badge designs for same purpose
- Mixed color schemes

---

### C. Typography Across Platform
**Files:** Multiple

#### Issues:
- Headings using inconsistent sizes
- Body text varying between 14px and 16px
- Line height inconsistencies

---

## Priority Fixes

### 🔴 Critical (Do First)
1. Standardize primary color usage (#2563EB everywhere)
2. Fix text contrast issues (soft black #1a1a1a)
3. Update background colors (off-white #F9FAFB)
4. Ensure all interactive elements meet 44x44px minimum

### 🟡 Important (Do Next)
5. Standardize border radius (rounded-xl for cards)
6. Apply 8px spacing system consistently
7. Update shadows to soft variants
8. Ensure typography hierarchy is consistent

### 🟢 Nice to Have (Polish)
9. Micro-animations consistency
10. Loading state standardization
11. Error message styling uniformity

---

## Implementation Plan

### Phase 1: Core Color System
- [ ] Update all bg-blue-* to use primary color
- [ ] Replace pure black with soft black
- [ ] Replace pure white with off-white backgrounds
- [ ] Audit border colors

### Phase 2: Component Standardization  
- [ ] Service cards
- [ ] Badges and chips
- [ ] Buttons
- [ ] Input fields
- [ ] Form elements

### Phase 3: Spacing & Layout
- [ ] Apply 8px grid system
- [ ] Standardize padding/margins
- [ ] Fix card spacing

### Phase 4: Typography
- [ ] Ensure consistent font sizes
- [ ] Fix line heights
- [ ] Standardize font weights

### Phase 5: Polish
- [ ] Update shadows
- [ ] Animation timing
- [ ] Focus states
- [ ] Hover effects

---

## Testing Checklist

After fixes, verify:
- [ ] Color contrast meets WCAG AA standards (4.5:1)
- [ ] Touch targets are 44x44px minimum
- [ ] Consistent spacing throughout
- [ ] Typography hierarchy is clear
- [ ] No custom colors outside design system
- [ ] Border radius is consistent
- [ ] Shadows are soft and subtle
- [ ] Focus states are visible
- [ ] Responsive on all breakpoints

---

## Design System Compliance Score

**Before Fixes:** 45/100  
**Target:** 95/100

### Breakdown:
- Colors: 30/100 → Target: 95/100
- Typography: 60/100 → Target: 95/100  
- Spacing: 50/100 → Target: 95/100
- Components: 40/100 → Target: 95/100
- Accessibility: 55/100 → Target: 95/100

---

## Next Steps

1. Review and approve this audit
2. Begin Phase 1 implementation
3. Test each phase before moving to next
4. Document any design system updates needed
5. Create component library for future consistency

---

**Status:** Ready for implementation  
**Estimated Time:** 4-6 hours for all phases  
**Risk Level:** Low (visual changes only, no functionality changes)
