# Component Consolidation Plan

## Overview

Audit identified **33+ redundant UI components** that should be consolidated to improve maintainability, reduce bundle size, and ensure design consistency.

## Priority 1: Input Components (5 variants → 2)

### Current State
| Component | Location | Usage |
|-----------|----------|-------|
| `input.tsx` | Primary | ✅ Keep - Base component |
| `validated-input.tsx` | With validation | ✅ Keep - Error handling |
| `enhanced-validated-input.tsx` | Extended | ❌ Merge into validated-input |
| `glass-input.tsx` | Glass effect | ❌ Add as variant to input.tsx |
| `formatted-input.tsx` | Masking | ⚠️ Review - may be needed for phone/medicare |

### Migration
```tsx
// Before: import { GlassInput } from "@/components/ui/glass-input"
// After:  import { Input } from "@/components/ui/input"
//         <Input variant="glass" />
```

## Priority 2: Button Components (5 variants → 1)

### Current State
| Component | Location | Recommendation |
|-----------|----------|----------------|
| `button.tsx` | Primary | ✅ Keep - Already has variants |
| `glass-button.tsx` | Glass effect | ❌ Remove - button.tsx has glass styles |
| `press-button.tsx` | Press effect | ❌ Remove - button.tsx has ripple |
| `rainbow-button.tsx` | Marketing | ⚠️ Keep for marketing pages only |
| `shatter-button.tsx` | Effect | ❌ Remove - unused |

## Priority 3: Skeleton Components (7 variants → 2)

### Current State
| Component | Recommendation |
|-----------|----------------|
| `skeleton.tsx` | ✅ Keep - Base |
| `unified-skeleton.tsx` | ✅ Keep - Complex layouts |
| `shimmer-skeleton.tsx` | ❌ Merge animation into skeleton.tsx |
| `premium-skeleton.tsx` | ❌ Remove |
| `skeleton-card.tsx` | ❌ Move to unified-skeleton |
| `skeleton-loader.tsx` | ❌ Duplicate |
| `skeleton-loaders.tsx` | ❌ Duplicate |

## Priority 4: Card Components (16 variants → 4)

### Keep
- `card.tsx` - Base card
- `glass-card.tsx` - Glass variant (merge into card.tsx)
- `service-card.tsx` - Domain-specific
- `radio-group-card.tsx` - Form input

### Remove/Merge
- `enhanced-card.tsx` → card.tsx variant
- `interactive-card.tsx` → card.tsx variant
- `animated-card.tsx` → card.tsx with motion
- `tilt-card.tsx` → Remove (unused)
- `spotlight-card.tsx` → Remove
- `swipeable-card.tsx` → Keep if used in mobile
- Others → Review usage

## Implementation Steps

1. **Audit usage** - Run `grep -r "import.*from.*glass-button" components app` for each
2. **Add variants** - Extend base components with variant props
3. **Update imports** - Find/replace across codebase
4. **Deprecate** - Add @deprecated JSDoc to old components
5. **Remove** - After 1 sprint, delete deprecated files

## Deprecation Pattern

```tsx
/**
 * @deprecated Use `<Input variant="glass" />` instead.
 * This component will be removed in v2.0.
 */
export function GlassInput(props: InputProps) {
  console.warn("GlassInput is deprecated. Use Input with variant='glass' instead.")
  return <Input variant="glass" {...props} />
}
```

## Timeline

- **Week 1**: Audit usage, add variants to base components
- **Week 2**: Migrate high-traffic pages
- **Week 3**: Migrate remaining pages
- **Week 4**: Remove deprecated components

## Bundle Impact Estimate

Current redundant component code: ~15KB (uncompressed)
Expected reduction: ~10KB after consolidation
