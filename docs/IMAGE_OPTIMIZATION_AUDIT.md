# Image Optimization Audit

**Date:** January 2026
**Status:** ✅ Mostly Optimized

---

## Summary

The codebase is **well-optimized** for images. Only **11 instances** of raw `<img>` tags found, most of which are justified exceptions.

---

## Findings

### Raw `<img>` Usage (11 instances)

| File | Justification | Action |
|------|---------------|--------|
| `components/ui/3d-folder.tsx` (2) | SVG/decorative animation | ✅ Keep - Next/Image not needed for inline SVG |
| `components/request/file-upload.tsx` | User-uploaded preview (blob URL) | ✅ Keep - Dynamic blob URLs can't use Next/Image |
| `components/ui/medicare-ocr.tsx` | User-uploaded OCR preview | ✅ Keep - Dynamic blob URLs |
| `components/ui/lazy-component.tsx` | Placeholder/fallback | ⚠️ Consider replacing |
| `components/ui/live-visitor.tsx` | Dynamic avatar | ⚠️ Consider replacing |
| `app/admin/clinic/clinic-client.tsx` | Admin avatar | ⚠️ Consider replacing with Avatar component |
| `app/admin/doctors/doctors-client.tsx` | Admin avatar | ⚠️ Consider replacing with Avatar component |
| `lib/email/templates/*.tsx` (3) | Email templates | ✅ Keep - Emails require raw `<img>` for compatibility |

---

## Recommendations

### High Priority (0 items)
No critical issues found.

### Medium Priority (4 items)
1. **`components/ui/lazy-component.tsx`** - Replace with Next/Image for placeholder
2. **`components/ui/live-visitor.tsx`** - Replace dynamic avatar with Next/Image
3. **`app/admin/clinic/clinic-client.tsx`** - Use Avatar component instead
4. **`app/admin/doctors/doctors-client.tsx`** - Use Avatar component instead

### Keep As-Is
- **Email templates** - Must use raw `<img>` for email client compatibility
- **File upload previews** - Blob URLs require native `<img>`
- **Decorative SVGs** - Next/Image adds overhead for inline SVGs

---

## Next/Image Usage Verification

To verify Next/Image is used correctly across the codebase:

```bash
# Count Next/Image imports
rg "from ['\"]next/image['\"]" --type tsx | wc -l

# Find all Image component usage
rg "<Image " app components --include='*.tsx' | wc -l
```

---

## Best Practices Implemented ✅

1. **OptimizedImage wrapper exists** - `components/ui/optimized-image.tsx`
2. **Proper sizing** - Most images use explicit width/height
3. **Priority loading** - Hero images use `priority` prop
4. **Lazy loading** - Default lazy loading for below-fold images
5. **WebP/AVIF** - Next.js automatic format optimization enabled

---

## Image Component Reference

```tsx
// Standard usage
import Image from "next/image"

<Image 
  src="/path/to/image.jpg"
  alt="Description"
  width={400}
  height={300}
  priority={false} // true for above-fold images
/>

// Fill container
<div className="relative w-full h-64">
  <Image 
    src="/path/to/image.jpg"
    alt="Description"
    fill
    className="object-cover"
  />
</div>

// With OptimizedImage wrapper
import { OptimizedImage } from "@/components/ui/optimized-image"

<OptimizedImage 
  src="/path/to/image.jpg"
  alt="Description"
  width={400}
  height={300}
/>
```

---

## Conclusion

Image optimization is in good shape. The 4 medium-priority items are minor and don't significantly impact performance. Email templates must keep raw `<img>` tags for compatibility.
