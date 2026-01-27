# Bundle Size Analysis

**Date:** January 2026
**Build Tool:** Next.js 14+

---

## Summary

| Metric | Value | Status |
|--------|-------|--------|
| First Load JS (shared) | 285 kB | ⚠️ Monitor |
| Largest page bundle | 83.2 kB (/pricing) | ⚠️ Consider splitting |
| Middleware | 137 kB | ✅ Acceptable |

---

## Largest Pages (First Load JS)

| Route | Page Size | Total Size | Action |
|-------|-----------|------------|--------|
| `/pricing` | 83.2 kB | 682 kB | 🔴 Code split |
| `/medical-certificates/*` | 2.4 kB | 755 kB | ⚠️ Shared chunk heavy |
| `/` (homepage) | 13.2 kB | 618 kB | ⚠️ Monitor |
| `/admin/services` | 17.5 kB | 463 kB | ⚠️ Large admin page |
| `/admin/emails` | 15.8 kB | 441 kB | ⚠️ Large admin page |
| `/admin/studio` | 15.3 kB | 441 kB | ⚠️ Large admin page |
| `/request` | 21.5 kB | 407 kB | ✅ Acceptable for main flow |

---

## Shared Chunks Analysis

| Chunk | Size | Contents (estimated) |
|-------|------|---------------------|
| `7392-*.js` | 133 kB | React, core UI components |
| `6013c66f-*.js` | 54.4 kB | Utility libraries |
| `aede6dd1-*.js` | 54.6 kB | Animation (Framer Motion) |
| `e406df73-*.js` | 37.1 kB | Additional shared code |
| Other shared | 4.99 kB | Misc |

---

## Recommendations

### High Priority

#### 1. Code-split `/pricing` page (83.2 kB)
```tsx
// Before: Static import
import { CreativePricing } from "@/components/ui/creative-pricing"

// After: Dynamic import
import dynamic from "next/dynamic"
const CreativePricing = dynamic(
  () => import("@/components/ui/creative-pricing").then(mod => mod.CreativePricing),
  { loading: () => <PricingSkeleton /> }
)
```

#### 2. Lazy-load Recharts on analytics pages
```tsx
// Chart components are heavy - lazy load them
const AreaChart = dynamic(
  () => import("recharts").then(mod => mod.AreaChart),
  { ssr: false }
)
```

#### 3. Split Framer Motion animations
```tsx
// Only import what you need
import { motion } from "framer-motion"  // Full bundle

// Better: Import specific features
import { m, LazyMotion, domAnimation } from "framer-motion"
```

### Medium Priority

#### 4. Code-split admin pages
Admin pages don't need to be in the main bundle since they're accessed less frequently.

```tsx
// In admin layout or individual pages
const AdminComponent = dynamic(() => import("./admin-component"), {
  loading: () => <AdminSkeleton />,
})
```

#### 5. Lazy-load PDF generation
```tsx
// PDF libraries are heavy
const generatePDF = async () => {
  const { pdf } = await import("@react-pdf/renderer")
  // Use pdf...
}
```

### Low Priority

#### 6. Tree-shake icon imports
```tsx
// Before: Imports entire icon library
import * as Icons from "lucide-react"

// After: Import only used icons
import { Check, X, AlertCircle } from "lucide-react"
```

---

## Code Splitting Patterns

### Route-based splitting (automatic)
Next.js automatically code-splits by route. Each page only loads its dependencies.

### Component-based splitting
```tsx
import dynamic from "next/dynamic"

// Heavy component
const HeavyChart = dynamic(() => import("@/components/heavy-chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Disable SSR for client-only components
})
```

### Conditional imports
```tsx
// Only load when needed
const handleExport = async () => {
  const { exportToPDF } = await import("@/lib/export")
  await exportToPDF(data)
}
```

---

## Monitoring Bundle Size

### Build-time analysis
```bash
# View bundle stats
ANALYZE=true pnpm build

# Or add to package.json
"scripts": {
  "analyze": "ANALYZE=true next build"
}
```

### Recommended thresholds
| Metric | Warning | Error |
|--------|---------|-------|
| First Load JS | > 300 kB | > 400 kB |
| Page bundle | > 50 kB | > 100 kB |
| Shared chunks | > 150 kB | > 200 kB |

---

## Next Steps

1. **Immediate**: Code-split `/pricing` page
2. **Short-term**: Lazy-load Recharts on admin analytics
3. **Medium-term**: Audit Framer Motion usage
4. **Ongoing**: Monitor bundle size in CI

---

## Bundle Analyzer Setup

Add to `next.config.mjs`:

```js
import withBundleAnalyzer from "@next/bundle-analyzer"

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

export default bundleAnalyzer(nextConfig)
```

Install:
```bash
pnpm add -D @next/bundle-analyzer
```
