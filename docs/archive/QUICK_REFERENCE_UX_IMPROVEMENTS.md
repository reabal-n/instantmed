# 🚀 Quick Reference: UX/UI Improvements

**Quick guide to using the new UX/UI components**

---

## 📦 Import Paths

```tsx
// Success States
import { SuccessState } from "@/components/ui/success-state"

// Progressive Disclosure
import { ProgressiveSection, ProgressiveDisclosure } from "@/components/ui/progressive-section"

// Contextual Help
import { ContextualHelp, InfoCard } from "@/components/ui/contextual-help"

// Interactive Cards
import { InteractiveCard } from "@/components/ui/interactive-card"

// Formatted Inputs
import { FormattedInput } from "@/components/ui/formatted-input"

// Mobile Detection
import { useMobile, useSafeArea } from "@/hooks/use-mobile"

// Form Formatting
import { formatMedicareNumber, formatPhoneNumber } from "@/lib/utils/form-formatting"
```

---

## 🎯 Common Patterns

### Success State After Form Submission
```tsx
{isSubmitted ? (
  <SuccessState
    title="Request submitted!"
    description="Our doctors will review it within 24 hours"
    showTiming={true}
    primaryAction={{
      label: "View dashboard",
      href: "/patient"
    }}
  />
) : (
  <FormComponent onSubmit={handleSubmit} />
)}
```

### Formatted Input with Help
```tsx
<div className="space-y-2">
  <Label className="flex items-center gap-2">
    Medicare Number
    <ContextualHelp
      content="Your 10-digit Medicare number from your card"
      variant="help"
    />
  </Label>
  <FormattedInput
    format="medicare"
    value={medicare}
    onChange={setMedicare}
  />
</div>
```

### Progressive Disclosure for Advanced Options
```tsx
<ProgressiveDisclosure label="advanced options">
  <Input label="Previous medications" />
  <Input label="Allergies" />
  <Input label="Medical history" />
</ProgressiveDisclosure>
```

### Interactive Card with Hover Effect
```tsx
<InteractiveCard
  hover={true}
  clickable={true}
  onClick={() => router.push('/details')}
  className="bg-white rounded-xl p-6 border border-gray-200"
>
  <h3 className="font-semibold mb-2">Card Title</h3>
  <p className="text-sm text-muted-foreground">Card content</p>
</InteractiveCard>
```

### Info Card for Context
```tsx
<InfoCard
  title="Why we need this"
  description="Medicare details ensure your certificate is valid for claiming purposes"
  variant="info"
/>
```

### Mobile-Specific Layout
```tsx
const { isMobile, isTouch } = useMobile()

return (
  <div className={isMobile ? "flex-col" : "flex-row"}>
    {isTouch && <p>Touch-optimized layout</p>}
  </div>
)
```

---

## 🎨 Format Types

Available formats for `FormattedInput`:

- `"medicare"` → `XXXX XXXX X`
- `"phone"` → `04XX XXX XXX`
- `"postcode"` → `XXXX`
- `"credit-card"` → `XXXX XXXX XXXX XXXX`
- `"expiry"` → `MM/YY`
- `"date"` → `DD/MM/YYYY`
- `"irn"` → `X`
- `"none"` → No formatting

---

## ✅ Checklist for New Forms

- [ ] Use `FormattedInput` for Medicare, phone, postcode
- [ ] Add `ContextualHelp` to complex fields
- [ ] Use `ProgressiveSection` for advanced options
- [ ] Show `SuccessState` after submission
- [ ] Ensure minimum 44px touch targets on mobile
- [ ] Test with `useMobile` hook for responsive behavior

---

## 🎯 When to Use Each Component

| Component | When to Use |
|-----------|-------------|
| `SuccessState` | After successful form submission, payment, or action |
| `ProgressiveSection` | Long forms with optional/advanced sections |
| `ProgressiveDisclosure` | Simple show/hide for a few fields |
| `ContextualHelp` | Complex fields that need explanation |
| `InfoCard` | Important context that should always be visible |
| `InteractiveCard` | Clickable cards (requests, services, etc.) |
| `FormattedInput` | Any input that needs auto-formatting |
| `useMobile` | When you need mobile-specific behavior |

---

**See `UX_UI_IMPROVEMENTS_2026.md` for full documentation.**

