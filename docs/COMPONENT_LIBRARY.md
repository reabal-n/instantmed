# Component Library Documentation

**Total Components:** 155 UI + 73 Shared + Domain-specific
**Last Updated:** January 2026

---

## Quick Reference

### Core UI Primitives (shadcn/ui based)
| Component | Import | Description |
|-----------|--------|-------------|
| `Button` | `@/components/ui/button` | Primary action button with variants |
| `Input` | `@/components/ui/input` | Text input field |
| `Textarea` | `@/components/ui/textarea` | Multi-line text input |
| `Select` | `@/components/ui/select` | Dropdown select |
| `Checkbox` | `@/components/ui/checkbox` | Checkbox input |
| `RadioGroup` | `@/components/ui/radio-group` | Radio button group |
| `Switch` | `@/components/ui/switch` | Toggle switch |
| `Label` | `@/components/ui/label` | Form label |
| `Badge` | `@/components/ui/badge` | Status badge |
| `Avatar` | `@/components/ui/avatar` | User avatar |
| `Card` | `@/components/ui/card` | Content card container |
| `Dialog` | `@/components/ui/dialog` | Modal dialog |
| `AlertDialog` | `@/components/ui/alert-dialog` | Confirmation dialog |
| `Sheet` | `@/components/ui/sheet` | Slide-out panel |
| `Popover` | `@/components/ui/popover` | Floating popover |
| `Tooltip` | `@/components/ui/tooltip` | Hover tooltip |
| `DropdownMenu` | `@/components/ui/dropdown-menu` | Context menu |
| `Table` | `@/components/ui/table` | Data table |
| `Tabs` | `@/components/ui/tabs` | Tab navigation |
| `Accordion` | `@/components/ui/accordion` | Collapsible sections |
| `Progress` | `@/components/ui/progress` | Progress bar |
| `Separator` | `@/components/ui/separator` | Visual divider |
| `ScrollArea` | `@/components/ui/scroll-area` | Custom scrollbar |

---

## Form Components

### Validation & Input
```tsx
import { FormField, FormErrorSummary, useFormValidation } from "@/components/ui/form-field"
import { ValidatedInput } from "@/components/ui/validated-input"
import { EnhancedValidatedInput } from "@/components/ui/enhanced-validated-input"
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea"
import { FormattedInput } from "@/components/ui/formatted-input"
import { PasswordStrength } from "@/components/ui/password-strength"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
```

### Form Layout
```tsx
import { FormSection } from "@/components/ui/form-section"
import { FormStepper } from "@/components/ui/form-stepper"
import { FormPersistence } from "@/components/ui/form-persistence"
import { AutosaveIndicator } from "@/components/ui/autosave-indicator"
```

---

## Loading & Skeleton States

### Skeletons
```tsx
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TableSkeleton, 
  CardSkeleton, 
  ListSkeleton, 
  FormSkeleton,
  GridSkeleton,
  ProfileSkeleton,
  PageHeaderSkeleton 
} from "@/components/ui/skeletons"
```

### Loading Indicators
```tsx
import { Spinner } from "@/components/ui/spinner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AccessibleLoading } from "@/components/ui/accessible-loading"
import { PageLoading } from "@/components/ui/page-loading"
import { Loader } from "@/components/ui/loader"
```

---

## Feedback & Status

### Toast & Notifications
```tsx
import { showSuccess, showError, showWarning, showInfo, showLoading } from "@/lib/ui/toast-config"
import { Sonner } from "@/components/ui/sonner"
```

### Status Indicators
```tsx
import { StatusBadges } from "@/components/ui/status-badges"
import { EstimatedTimeBadge } from "@/components/ui/estimated-time-badge"
import { ProgressIndicator } from "@/components/ui/progress-indicator"
import { ProgressIndicatorCompact } from "@/components/ui/progress-indicator-compact"
```

### Error States
```tsx
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { ErrorRecovery } from "@/components/ui/error-recovery"
import { EnhancedErrorState } from "@/components/ui/enhanced-error-state"
import { RateLimitMessage, useRateLimit } from "@/components/ui/rate-limit-message"
```

### Success States
```tsx
import { SuccessAnimation } from "@/components/ui/success-animation"
import { SuccessCelebration } from "@/components/ui/success-celebration"
import { SuccessCheckmark } from "@/components/ui/success-checkmark"
import { SuccessState } from "@/components/ui/success-state"
import { Confetti } from "@/components/ui/confetti"
```

### Empty States
```tsx
import { EmptyState } from "@/components/ui/empty-state"
import { EnhancedEmptyState } from "@/components/ui/enhanced-empty-state"
```

---

## Animation & Effects

### Page Transitions
```tsx
import { PageTransition, FadeTransition, SlideTransition, ScaleTransition } from "@/components/effects/page-transition"
```

### Motion Components
```tsx
import { motion, AnimatePresence } from "framer-motion"
import { Motion } from "@/components/ui/motion"
import { BlurFade } from "@/components/ui/blur-fade"
import { RippleEffect } from "@/components/ui/ripple-effect"
import { GlowingEffect } from "@/components/ui/glowing-effect"
```

### Visual Effects
```tsx
import { AuroraBackground } from "@/components/ui/aurora-background"
import { NightSkyBackground } from "@/components/ui/night-sky-background"
import { SkyBackground } from "@/components/ui/sky-background"
import { GradientBg } from "@/components/ui/gradient-bg"
import { SparklesText } from "@/components/ui/sparkles-text"
```

---

## Glass Morphism Components
```tsx
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import { GlassRadioGroup } from "@/components/ui/glass-radio-group"
```

---

## Cards & Containers

### Basic Cards
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { EnhancedCard } from "@/components/ui/enhanced-card"
import { InteractiveCard } from "@/components/ui/interactive-card"
import { VisualCard } from "@/components/ui/visual-card"
```

### Animated Cards
```tsx
import { AnimatedCard } from "@/components/ui/animated-card"
import { SpotlightCard } from "@/components/ui/spotlight-card"
import { TiltCard } from "@/components/ui/tilt-card"
import { SwipeableCard } from "@/components/ui/swipeable-card"
import { MorphingCardStack } from "@/components/ui/morphing-card-stack"
```

### Specialty Cards
```tsx
import { ServiceCard } from "@/components/ui/service-card"
import { StatisticsCard } from "@/components/ui/statistics-card"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { DisplayCards } from "@/components/ui/display-cards"
```

---

## Navigation

### Mobile Navigation
```tsx
import { MobileNav } from "@/components/ui/mobile-nav"
import { AnimatedMobileMenu } from "@/components/ui/animated-mobile-menu"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { MobileUtilities } from "@/components/ui/mobile-utilities"
```

### Desktop Navigation
```tsx
import { TubelightNavbar } from "@/components/ui/tubelight-navbar"
import { GlowMenu } from "@/components/ui/glow-menu"
import { Dock } from "@/components/ui/dock"
import { ExpandableTabs } from "@/components/ui/expandable-tabs"
```

---

## Buttons

### Standard Buttons
```tsx
import { Button } from "@/components/ui/button"
// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon
```

### Specialty Buttons
```tsx
import { PressButton } from "@/components/ui/press-button"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { ShatterButton } from "@/components/ui/shatter-button"
```

---

## Accessibility Components
```tsx
import { FocusTrap } from "@/components/ui/focus-trap"
import { LiveRegion } from "@/components/ui/live-region"
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts"
import { ContextualHelp } from "@/components/ui/contextual-help"
import { HelpTooltip } from "@/components/ui/help-tooltip"
```

---

## Shared Domain Components

### Patient Components
```tsx
import { IntakeStatusTracker } from "@/components/patient/intake-status-tracker"
import { QueueStatus } from "@/components/patient/queue-status"
import { DashboardContent } from "@/components/patient/dashboard-content"
import { PaymentHistoryContent } from "@/components/patient/payment-history-content"
import { SettingsContent } from "@/components/patient/settings-content"
import { RefillReminderCard } from "@/components/patient/refill-reminder-card"
```

### Doctor Components
```tsx
import { DraftReviewPanel } from "@/components/doctor/draft-review-panel"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { ChatTranscriptPanel } from "@/components/doctor/chat-transcript-panel"
import { QuickNotesTemplates } from "@/components/doctor/quick-notes-templates"
import { AvailabilityToggle } from "@/components/doctor/availability-toggle"
import { KeyboardShortcutsModal } from "@/components/doctor/keyboard-shortcuts-modal"
```

### Admin Components
```tsx
import { TableSkeleton, StatsCard, StatusBadge, DataRow } from "@/components/admin/shared"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"
import { CertificatePreview } from "@/components/admin/certificate-preview"
import { RealtimeStatus } from "@/components/admin/realtime-status"
```

### Flow/Intake Components
```tsx
import { FlowShell } from "@/components/flow/flow-shell"
import { FlowCta } from "@/components/flow/flow-cta"
import { FieldRenderer } from "@/components/flow/field-renderer"
import { IntakeModal } from "@/components/flow/intake-modal"
import { ResumePrompt } from "@/components/flow/resume-prompt"
import { ConnectionStatus } from "@/components/flow/connection-status"
```

---

## Utility Components

### Performance
```tsx
import { LazyComponent } from "@/components/ui/lazy-component"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { PerformanceUtils } from "@/components/ui/performance-utils"
```

### Content
```tsx
import { SafeHtml } from "@/components/ui/safe-html"
import { HighlightText } from "@/components/ui/highlight-text"
import { Typewriter } from "@/components/ui/typewriter"
import { RotatingText } from "@/components/ui/rotating-text"
import { PdfPreview } from "@/components/ui/pdf-preview"
```

---

## Usage Examples

### Form with Validation
```tsx
import { FormField, useFormValidation } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function MyForm() {
  const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation(
    { email: "", name: "" },
    {
      email: (v) => (!v ? "Email required" : undefined),
      name: (v) => (!v ? "Name required" : undefined),
    }
  )

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (validateAll()) submit() }}>
      <FormField label="Email" error={errors.email} required>
        <Input value={values.email} onChange={handleChange("email")} onBlur={handleBlur("email")} />
      </FormField>
      <FormField label="Name" error={errors.name} required>
        <Input value={values.name} onChange={handleChange("name")} onBlur={handleBlur("name")} />
      </FormField>
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

### Loading State with Skeleton
```tsx
import { TableSkeleton } from "@/components/ui/skeletons"
import { Table } from "@/components/ui/table"

function DataTable({ data, isLoading }) {
  if (isLoading) return <TableSkeleton rows={10} columns={5} />
  return <Table>{/* ... */}</Table>
}
```

### Toast Notifications
```tsx
import { showSuccess, showError, showPromise } from "@/lib/ui/toast-config"

// Simple toasts
showSuccess("Saved successfully")
showError("Failed to save")

// Promise-based toast
showPromise(saveData(), {
  loading: "Saving...",
  success: "Saved!",
  error: "Failed to save"
})
```

---

## File Organization

```
components/
├── ui/           # 155 reusable UI primitives
├── shared/       # 73 shared business components
├── admin/        # Admin-specific components
├── doctor/       # Doctor portal components
├── patient/      # Patient portal components
├── flow/         # Intake flow components
├── intake/       # Intake-specific components
├── chat/         # Chat/messaging components
├── marketing/    # Marketing page components
├── homepage/     # Homepage-specific components
├── blog/         # Blog components
├── effects/      # Animation/effect components
├── a11y/         # Accessibility components
└── providers/    # Context providers
```
