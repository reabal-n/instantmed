# 🎨 21st.dev Aesthetic Micro-Interactions Guide

**Date:** April 2026  
**Status:** Leveraging Existing Premium Components  
**Purpose:** Apply aesthetic 21st.dev components for delightful micro-interactions

---

## 🎯 Existing Components Found

Your repo already has these amazing 21st.dev-style components:

### **React Components:**
- ✅ `TiltCard` - 3D tilt effect on mouse move
- ✅ `GlassCard` - Glassmorphism with hover lift
- ✅ `HolographicCard` - Holographic shine effect
- ✅ `CursorSpotlight` - Grid spotlight on hover
- ✅ `GradientMesh` - Interactive gradient background

### **CSS Classes (already in globals.css):**
- ✅ `.magnetic-button` - Button with magnetic hover
- ✅ `.interactive-pill` - Pill with lift and glow
- ✅ `.scale-spring` - Spring scale animation
- ✅ `.hover-lift` - Card lift on hover
- ✅ `.icon-spin-hover` - Icon rotation on hover
- ✅ `.card-3d` - 3D card with perspective
- ✅ `.card-shine` - Card shine sweep on hover
- ✅ `.glow-pulse` - Pulsing glow effect
- ✅ `.btn-micro` - Button micro-interactions (already implemented)
- ✅ `.card-micro` - Card micro-interactions (already implemented)

---

## 🚀 How to Apply

### **1. Button Hover Effects**

#### Option A: Magnetic Button (Existing)
```tsx
import { Button } from "@heroui/react"

<Button className="magnetic-button shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35">
  Click me
</Button>
```

#### Option B: Premium Button with Shimmer (Existing)
```tsx
<Button className="btn-premium">
  {/* Has built-in shimmer sweep on hover */}
  Premium Action
</Button>
```

#### Option C: Scale Spring (Existing)
```tsx
<Button className="scale-spring">
  {/* Scales up with spring effect */}
  Spring Button
</Button>
```

#### Option D: Combined Effects
```tsx
<Button className="magnetic-button glow-pulse">
  {/* Magnetic hover + pulsing glow */}
  Combined Effect
</Button>
```

---

### **2. Card Hover Effects**

#### Option A: Tilt Card (Existing Component)
```tsx
import { TiltCard } from "@/components/shared/tilt-card"

<TiltCard tiltAmount={10}>
  <div className="bg-white rounded-xl p-6">
    {/* 3D tilt follows mouse */}
    Card content
  </div>
</TiltCard>
```

#### Option B: Glass Card with Lift (Existing Component)
```tsx
import { GlassCard } from "@/components/effects/glass-card"

<GlassCard hover={true}>
  {/* Glassmorphism + hover lift */}
  <p>Premium glass effect</p>
</GlassCard>
```

#### Option C: Holographic Card (Existing Component)
```tsx
import { HolographicCard } from "@/components/effects/holographic-card"

<HolographicCard intensity="medium">
  {/* Holographic shine + tilt */}
  <div className="p-6">
    Holographic content
  </div>
</HolographicCard>
```

#### Option D: Card with Shine Sweep (Existing CSS)
```tsx
<div className="card-shine bg-white rounded-xl p-6 hover-lift">
  {/* Shine sweeps across on hover + lifts */}
  Card content
</div>
```

#### Option E: 3D Card with Perspective (Existing CSS)
```tsx
<div className="card-3d bg-white rounded-xl p-6">
  {/* 3D perspective transforms */}
  Card content
</div>
```

---

### **3. Input Focus Animations**

#### Option A: Input with Glow (Existing CSS)
```tsx
<Input className="input-glow" />
{/* Glows on focus with primary color */}
```

#### Option B: Input Micro-Interaction (Already implemented)
```tsx
<Input className="input-micro" />
{/* Scales slightly + glow on focus */}
```

#### Option C: Custom Focus Effect
```tsx
<Input
  className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/20"
  classNames={{
    inputWrapper: "hover:border-primary/50 data-[focused=true]:border-primary data-[focused=true]:ring-4 data-[focused=true]:ring-primary/10"
  }}
/>
```

---

## 📦 Complete Component Examples

### Example 1: Premium Service Card
```tsx
import { TiltCard } from "@/components/shared/tilt-card"
import { motion } from "framer-motion"

export function ServiceCard({ title, description, icon: Icon }) {
  return (
    <TiltCard tiltAmount={8}>
      <motion.div
        className="card-shine bg-white rounded-2xl p-6 border border-gray-200 hover-lift cursor-pointer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 icon-spin-hover">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </motion.div>
    </TiltCard>
  )
}
```

---

### Example 2: Premium CTA Button
```tsx
import { Button } from "@heroui/react"
import { ArrowRight } from "lucide-react"

export function PremiumCTA({ onClick, children }) {
  return (
    <Button
      onClick={onClick}
      className="magnetic-button btn-premium glow-pulse shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
      endContent={<ArrowRight className="w-4 h-4" />}
    >
      {children}
    </Button>
  )
}
```

---

### Example 3: Interactive Dashboard Card
```tsx
import { GlassCard } from "@/components/effects/glass-card"
import { motion } from "framer-motion"

export function DashboardCard({ title, value, icon: Icon, onClick }) {
  return (
    <GlassCard hover={true}>
      <motion.div
        onClick={onClick}
        className="p-6 cursor-pointer"
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-spin-hover">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <h3 className="text-sm text-muted-foreground">{title}</h3>
      </motion.div>
    </GlassCard>
  )
}
```

---

### Example 4: Holographic Request Card
```tsx
import { HolographicCard } from "@/components/effects/holographic-card"

export function RequestCard({ request }) {
  return (
    <HolographicCard intensity="low">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{request.title}</h3>
          <span className="interactive-pill px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
            {request.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{request.description}</p>
      </div>
    </HolographicCard>
  )
}
```

---

### Example 5: Form with Enhanced Inputs
```tsx
import { ValidatedInput } from "@/components/ui/validated-input"
import { HelpTooltip } from "@/components/ui/help-tooltip"

export function EnhancedForm() {
  return (
    <form className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium">Email</label>
          <HelpTooltip content="We'll send updates to this email" />
        </div>
        <ValidatedInput
          className="input-glow"
          // Combines validation + glow effect
        />
      </div>
      
      <Button className="magnetic-button w-full">
        Submit
      </Button>
    </form>
  )
}
```

---

## 🎨 Recommended Combinations

### **For Buttons:**
```tsx
// Primary CTA
<Button className="magnetic-button glow-pulse">Primary Action</Button>

// Secondary Action
<Button className="scale-spring">Secondary</Button>

// Premium Effect
<Button className="btn-premium">Premium</Button>
```

### **For Cards:**
```tsx
// Interactive Dashboard Card
<div className="card-3d hover-lift card-shine">...</div>

// Premium Service Card (React component)
<TiltCard><div className="hover-lift">...</div></TiltCard>

// Special Feature Card (React component)
<HolographicCard intensity="medium">...</HolographicCard>
```

### **For List Items:**
```tsx
// Interactive List Item
<div className="hover-lift scale-spring">...</div>

// Pill Badge
<span className="interactive-pill">Status</span>

// Icon with Rotation
<Icon className="icon-spin-hover" />
```

---

## ✨ Integration with Existing UX Components

### EmptyState with Holographic Card
```tsx
import { EmptyState } from "@/components/ui/empty-state"
import { HolographicCard } from "@/components/effects/holographic-card"
import { FileText } from "lucide-react"

<HolographicCard intensity="low">
  <EmptyState
    icon={FileText}
    title="No requests yet"
    description="Start your first medical certificate request"
    action={{
      label: "Start a request",
      onClick: handleStart
    }}
  />
</HolographicCard>
```

---

### Success State with Magnetic Button
```tsx
import { SuccessState } from "@/components/ui/success-state"

<SuccessState
  title="Request submitted!"
  description="Our doctors will review it within 24 hours"
  showConfetti={true}
  actions={{
    primary: {
      label: "View dashboard",
      onClick: goDashboard,
      // Add className for magnetic effect
    }
  }}
/>

// Then modify SuccessState internally to support className on actions
```

---

### Validated Input with Enhanced Focus
```tsx
import { ValidatedInput } from "@/components/ui/validated-input"

<ValidatedInput
  label="Email"
  className="input-glow"
  // Combines validation feedback + glow effect
  validationRules={[validationRules.email]}
/>
```

---

## 🎯 Best Practices

### **Buttons:**
1. **Primary CTAs** → Use `.magnetic-button` + `.glow-pulse`
2. **Secondary actions** → Use `.scale-spring`
3. **Premium features** → Use `.btn-premium` (has built-in shimmer)
4. **Icon buttons** → Add `.icon-spin-hover` to the icon

### **Cards:**
1. **Dashboard cards** → Use `<GlassCard>` or `.card-3d`
2. **Interactive lists** → Use `.hover-lift` + `.card-shine`
3. **Feature highlights** → Use `<HolographicCard>`
4. **Service cards** → Use `<TiltCard>` for 3D effect

### **Inputs:**
1. **All form inputs** → Add `.input-glow` for focus effect
2. **Important fields** → Combine with `.input-micro` for scale
3. **Search inputs** → Use `.input-glow` for enhanced visibility

---

## 📊 Performance Considerations

**Lightweight Effects (use freely):**
- `.scale-spring`
- `.hover-lift`
- `.interactive-pill`
- `.icon-spin-hover`
- `.magnetic-button`

**Heavier Effects (use sparingly):**
- `<TiltCard>` (uses mousemove tracking)
- `<HolographicCard>` (multiple layers + calculations)
- `.card-shine` (pseudo-element animations)
- `.glow-pulse` (continuous animation)

**Recommendation:** Use heavier effects on key interaction points only (CTAs, featured cards).

---

## 🚀 Quick Migration Guide

### **Step 1: Enhance Patient Dashboard Cards**
```tsx
// Before
<div className="bg-white rounded-xl p-6">
  Card content
</div>

// After
<div className="card-3d hover-lift card-shine bg-white rounded-xl p-6">
  Card content
</div>
```

---

### **Step 2: Enhance CTA Buttons**
```tsx
// Before
<Button className="bg-primary">Start Request</Button>

// After
<Button className="magnetic-button glow-pulse bg-primary">
  Start Request
</Button>
```

---

### **Step 3: Enhance Form Inputs**
```tsx
// Before
<Input />

// After
<Input className="input-glow" />
```

---

### **Step 4: Enhance Service Selector**
```tsx
import { TiltCard } from "@/components/shared/tilt-card"

// Before
<div onClick={selectService}>Service Card</div>

// After
<TiltCard>
  <div onClick={selectService} className="hover-lift">
    Service Card
  </div>
</TiltCard>
```

---

## 🎨 Complete Page Example

```tsx
import { TiltCard } from "@/components/shared/tilt-card"
import { GlassCard } from "@/components/effects/glass-card"
import { HolographicCard } from "@/components/effects/holographic-card"
import { EmptyState } from "@/components/ui/empty-state"
import { ValidatedInput } from "@/components/ui/validated-input"
import { Button } from "@heroui/react"

export function EnhancedPatientDashboard() {
  return (
    <div className="space-y-6">
      {/* Hero Section with Holographic Card */}
      <HolographicCard intensity="medium">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Welcome back!</h1>
          <Button className="magnetic-button glow-pulse">
            Start New Request
          </Button>
        </div>
      </HolographicCard>

      {/* Service Grid with Tilt Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map(service => (
          <TiltCard key={service.id}>
            <div className="card-shine hover-lift bg-white rounded-xl p-6">
              <div className="icon-spin-hover mb-4">
                <service.icon className="w-8 h-8 text-primary" />
              </div>
              <h3>{service.title}</h3>
            </div>
          </TiltCard>
        ))}
      </div>

      {/* Stats with Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <GlassCard key={stat.id} hover={true}>
            <div className="p-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Form with Enhanced Inputs */}
      <div className="card-3d bg-white rounded-xl p-6">
        <form className="space-y-4">
          <ValidatedInput
            label="Email"
            className="input-glow"
            validationRules={[validationRules.email]}
          />
          <Button className="magnetic-button w-full">
            Submit
          </Button>
        </form>
      </div>

      {/* Empty State with Pill Badge */}
      {requests.length === 0 && (
        <div className="hover-lift">
          <EmptyState
            icon={FileText}
            title="No requests yet"
            description="Start your first request"
          />
        </div>
      )}
    </div>
  )
}
```

---

## ✅ Summary

**Existing Components to Use:**
1. **`<TiltCard>`** - 3D tilt following mouse
2. **`<GlassCard>`** - Glassmorphism with hover
3. **`<HolographicCard>`** - Holographic effects
4. **CSS Classes** - magnetic-button, hover-lift, card-shine, etc.

**Where to Apply:**
- ✅ Buttons → magnetic-button, glow-pulse, scale-spring
- ✅ Cards → TiltCard, GlassCard, card-3d, hover-lift
- ✅ Inputs → input-glow, input-micro
- ✅ Icons → icon-spin-hover
- ✅ Badges → interactive-pill

**Performance:**
- Use lightweight effects everywhere
- Use heavier effects (TiltCard, HolographicCard) on key elements only

**Next Steps:**
1. Apply `.magnetic-button` to all CTAs
2. Wrap dashboard cards in `<TiltCard>` or add `.hover-lift`
3. Add `.input-glow` to all form inputs
4. Use `<HolographicCard>` for premium features

---

**Your 21st.dev aesthetic components are already built and ready to use! 🎨✨**
