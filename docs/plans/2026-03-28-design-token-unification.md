# Design Token Unification

> Eliminate hardcoded Tailwind palette colors, add missing tint tokens, create StatusPill component, fix font-weight violations, and update DESIGN_SYSTEM.md spec.

**Date:** 2026-03-28
**Status:** Approved

---

## Problem

~309 raw Tailwind palette colors (`bg-green-50`, `text-red-600`, `border-amber-200`) bypass the semantic token system. If we change `--success` from `#22C55E` to something else, half the green UI stays the same. The token system defines base colors but not the tint/shade variants components actually need.

Additionally: 131 `font-bold` usages violate the 600-max weight rule, and DESIGN_SYSTEM.md has ambiguities around `initial={false}`, backdrop-blur scope, and scale limits.

## Solution

### Layer 1: Add Tint Tokens to `globals.css`

Add light background, border, and text variants for each semantic color in both `:root` and `.dark`:

```css
:root {
  --success-light: #F0FDF4;
  --success-border: rgba(34,197,94,0.20);
  --warning-light: #FFFBEB;
  --warning-border: rgba(245,158,11,0.20);
  --destructive-light: #FEF2F2;
  --destructive-border: rgba(248,113,113,0.20);
  --info: #3B82F6;
  --info-foreground: #ffffff;
  --info-light: #EFF6FF;
  --info-border: rgba(59,130,246,0.20);
}
.dark {
  --success-light: rgba(74,222,128,0.10);
  --success-border: rgba(74,222,128,0.20);
  --warning-light: rgba(251,191,36,0.10);
  --warning-border: rgba(251,191,36,0.20);
  --destructive-light: rgba(224,122,122,0.10);
  --destructive-border: rgba(224,122,122,0.20);
  --info: #60A5FA;
  --info-foreground: #0B1120;
  --info-light: rgba(96,165,250,0.10);
  --info-border: rgba(96,165,250,0.20);
}
```

Register in `@theme inline`:
```css
--color-success-light: var(--success-light);
--color-success-border: var(--success-border);
--color-warning-light: var(--warning-light);
--color-warning-border: var(--warning-border);
--color-destructive-light: var(--destructive-light);
--color-destructive-border: var(--destructive-border);
--color-info: var(--info);
--color-info-foreground: var(--info-foreground);
--color-info-light: var(--info-light);
--color-info-border: var(--info-border);
```

Also add DESIGN_SYSTEM.md tokens that are actively needed:
- `--morning-sky`, `--morning-peach`, `--morning-ivory`, `--morning-champ` (hero gradients)
- `--trust-bg`, `--trust-border`, `--trust-text` (trust signals)
- Service type tokens: `--service-medcert`, `--service-rx`, `--service-hair`, `--service-weight`

### Layer 2: Create `StatusPill` CVA Component

`components/ui/status-pill.tsx` — CVA-based pill with variants:

- `success` — approved, complete, active states
- `warning` — pending, review, attention states
- `destructive` — declined, error, expired states
- `info` — processing, in-progress, informational states
- `neutral` — default, inactive states

Props: `variant`, `size` (sm/md), `dot` (animated pulse dot), `icon`, `className`.

Uses the new semantic tokens exclusively. No raw Tailwind colors.

### Layer 3: Migrate Raw Colors → Tokens

Replace ~309 raw color usages across ~50 files:

| Raw Pattern | Token Replacement |
|------------|-------------------|
| `bg-green-50` / `bg-green-100` | `bg-success-light` |
| `text-green-600` / `text-green-700` | `text-success` |
| `border-green-200` / `border-green-300` | `border-success-border` |
| `bg-red-50` / `bg-red-100` | `bg-destructive-light` |
| `text-red-600` / `text-red-700` | `text-destructive` |
| `border-red-200` / `border-red-300` | `border-destructive-border` |
| `bg-amber-50` / `bg-amber-100` | `bg-warning-light` |
| `text-amber-600` / `text-amber-700` | `text-warning` |
| `border-amber-200` / `border-amber-300` | `border-warning-border` |
| `bg-blue-50` / `bg-blue-100` | `bg-info-light` |
| `text-blue-600` / `text-blue-700` | `text-info` (or `text-primary` where appropriate) |
| `border-blue-200` / `border-blue-300` | `border-info-border` |

Dark mode variants (`dark:bg-green-500/10` etc.) map to the same tokens since `.dark` defines them.

**Exceptions (keep raw):**
- Third-party brand colors (Stripe `#635BFF`, social media brand colors)
- Chart/visualization colors that need distinct hues beyond semantic meaning
- `bg-emerald-*` on availability indicators (distinct from success semantic)

### Layer 4: Fix `font-bold` → `font-semibold`

Bulk replace 131 occurrences of `font-bold` → `font-semibold` across all .tsx files.
Remove any `font-extrabold` occurrences.

**Exception:** Keep `font-bold` only in:
- Checkout trust badges (Stripe branding)
- Any third-party embed styling

### Layer 5: Fix Switch Green

Replace hardcoded `#6BBF8A` in `components/ui/switch.tsx` with `--success` token.

### Layer 6: Update DESIGN_SYSTEM.md

Clarify spec ambiguities:
1. `AnimatePresence initial={false}` is valid — only `motion.div initial={false}` is wrong
2. `backdrop-blur` permitted on: overlays, sticky bars, mobile nav, **AND popovers/dropdowns**
3. Scale >1.02x allowed on non-interactive animations (loaders, background blobs, pulse effects)
4. Violet/purple allowed for AI/automation indicators in internal portals (admin, doctor)
5. Third-party brand colors are exceptions to the color token rule
6. Document the new tint token system and StatusPill component

## Files Changed

- `app/globals.css` — add tint tokens + @theme mappings
- `components/ui/status-pill.tsx` — new CVA component
- `components/ui/switch.tsx` — fix hardcoded green
- `DESIGN_SYSTEM.md` — spec updates
- ~50 component files — token migration + font-bold fix

## Risks

- Large surface area (~50 files). Visual regression possible on status badges/pills.
- Need to verify dark mode tint tokens render correctly (rgba-based).
- StatusPill adoption is opt-in — existing inline patterns will coexist until migrated.
