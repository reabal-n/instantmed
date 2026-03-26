# UI Refinements Design — InstantMed
**Date:** 2026-03-27
**Goal:** Make the platform feel like the modern telehealth — loops.so / dub.co / craft.do aesthetic. Remove AI/template signals. Tighten every surface without breaking what works.

---

## Design Principles for This Pass

- Decoration earns its place. If it doesn't add information or create hierarchy, remove it.
- Confidence over performance. A static, bold headline beats a rotating one *unless* the copy is genuinely better. Social proof doesn't pop up — it just exists.
- Medical authority reads quiet. Trust is built through specificity and restraint, not badges and counters.
- Keep what the user likes. Rotating text (improved copy), magnetic button, patient counter, mini product mockups in service cards, DiceBear avatars, trust badge marquee.

---

## Surface 1 — Hero (`components/marketing/hero.tsx`)

### Remove
- Animated radial background blobs (if any)
- `CheckCircle2` / `CreditCard` icon clutter in trust signals row

### Change
- **Rotating text copy** — current texts feel generic ("Get a medical certificate today"). Replace with copy that's specific, dry, confident. Examples:
  - `"Back at work tomorrow."` / `"A certificate by lunch."` / `"Sorted before dinner."` / `"No waiting room required."` / `"Done in under an hour."`
- **Trust signals row** — replace icon + text pattern with plain `·`-separated inline text: `AHPRA-registered doctors · Accepted by all employers · No account required`
- **Patient counter** — keep live interpolated counter. Add a second stat alongside it: `"X patients helped"` and e.g. `"4.8★ average rating"` as a stat pair. Style as two clean inline stats, not cards.
- **Sub-headline** — audit for AI-sounding phrasing. Should read like a calm GP explaining the service, not a startup pitch.

### Keep
- `MagneticButton` on primary CTA
- `DoctorAvailabilityPill`
- `HeroProductMockup` on desktop
- Framer Motion entrance animations (correct timing already)

---

## Surface 2 — Service Picker (`components/marketing/service-picker.tsx`)

### Remove
- `SparklesPremium` icon + pill badge above heading (`"Pick what you need"`)
- `AnimatedText` wavy SVG underline on section heading
- Gradient accent bars on each card (`h-1.5 bg-gradient-to-r from-X to-Y`)
- Background blur blobs (`absolute` radial gradients)

### Change
- **Section heading** — plain `h2`, no badge, no animation. "What do you need?" or "Our services" — direct and undecorated.
- **Section subheading** — keep but tighten copy
- **Service icons** — replace gradient `backgroundColor: colors.light` with a single flat muted background. Monochromatic icon tint matching primary.
- **"Most common" badge** — keep but move inside the card header row (inline with title), not floating above the card
- **Card border** — keep existing `border border-border/50 shadow-lg shadow-primary/[0.06]` — this is already correct
- **Mini product mockups** — keep. Clean them up if they have gimmicky animations.
- **Price display** — make price the visual anchor. Larger, bolder. GP comparison stays as quiet `text-xs text-muted-foreground`.

### Keep
- 3-column grid layout
- Hover lift animation
- `popular` ring treatment
- Service availability disabled state

---

## Surface 3 — How It Works (`components/marketing/how-it-works.tsx`)

### Remove
- `DottedGrid` background component

### Change
- **Floating card mockups** — keep the FloatingCard layout but clean up contents:
  - Remove the `animate-[blink]` cursor in StepOneMockup (feels gimmicky)
  - StepThreeMockup: the download button inside the card can stay but simplify — remove mock file size label
  - Reduce internal padding noise — cards should breathe
- **Step 3 copy** — "Sorted" is too casual. Change to `"Done."` as the title and `"Certificate in your inbox. Prescription to your phone. All taken care of."` as description. Or just `"In your inbox."`.
- **Timeline connector** — keep the `border-dashed border-primary/20` desktop connector, it works
- **Step number display** — current `text-5xl font-light text-muted-foreground/15` is correct — keep

### Keep
- `FloatingCard` component and directional entrance animations
- 3-column → 1-column responsive grid
- Bottom CTA

---

## Surface 4 — Social Proof

### Remove
- `SocialProofNotifications` component entirely — delete, not hide. Pop-up social proof notifications are a trust-destroying dark pattern for medical services.

### Change
- **Testimonials** (`lib/marketing/testimonials.ts` or wherever data lives):
  - Remove `role`/`occupation` field from display — showing occupation is a cliché signal of fake testimonials
  - Rewrite copy to sound like real patients: specific situations, real language, not polished blurbs. E.g. instead of "Excellent service, very professional" → "Had a cold on a Monday morning, didn't want to sit in a waiting room for two hours. Certificate was in my inbox before I finished my second coffee."
  - Keep DiceBear avatars — they're fine, occupation was the problem
- **Trust badge marquee** — keep animation. Remove any badges that feel like made-up awards. Keep: AHPRA, TGA, Medicare, RACGP, SSL/secure payment.
- **Regulatory logos row** — keep as-is

### Keep
- `TestimonialsColumnsWrapper` scrolling columns
- `TrustBadgeSlider` marquee

---

## Surface 5 — Patient Portal (`components/patient/panel-dashboard.tsx`)

### Remove
- Stat grid if all values are zero (shows nothing useful pre-activity, looks broken)

### Change
- **Status pills** on request cards — reduce visual weight. Current status badges are loud. Use a left border accent + quiet text instead of a filled badge. (Linear-style)
- **Empty state copy** — replace generic empty state text with human language: `"Nothing here yet. Once you submit a request, it'll show up here."` No illustration, no CTA button in the empty state — keep it minimal.
- **Profile todo card** — reframe as a quiet inline notice rather than a progress widget. One line: `"Add your phone number to unlock prescriptions and consults →"` in muted text. Not a card with steps.
- **Request card** — tighten information hierarchy. Service name prominent, status secondary, date tertiary. Remove any redundant labels.

---

## Surface 6 — Doctor Portal (`components/doctor/`)

### Change
- **Review queue** — compact list density. Status as a left-border color accent (2px), not a filled badge. Shows more intakes at once.
- **Intake review panel** — pull clinical summary to the top of the panel. Doctor needs to assess the case first, admin actions (approve/decline) come after reading.
- **Approval buttons** — ensure they're visually final: solid green Approve, solid red Decline. No ambiguity. Currently likely outline variants — make them filled.
- **Draft review panel** — if showing AI summary, label it clearly as "AI draft — review before approving" so it never implies automatic approval.

---

## Copy Audit Notes (applies everywhere)

Patterns to find and replace:
- "Instantly" / "instant" → remove (AHPRA compliance + brand voice)
- "Fast" / "quickly" → remove or replace with specific time ("within the hour")
- "Sorted" as a standalone title → "Done." or specific outcome
- "Amazing" / "excellent" in testimonials → too polished, sounds fake
- Any testimonial ending in "Highly recommend!" → rewrite as specific situation
- Section subheadings that are just restating the heading → cut or replace with a genuine detail

---

## Files Affected

| File | Change |
|------|--------|
| `components/marketing/hero.tsx` | Rotating text copy, trust signal row |
| `components/marketing/service-picker.tsx` | Remove badge/underline/gradient bars, section heading |
| `components/marketing/how-it-works.tsx` | Remove DottedGrid, clean mockup internals, copy |
| `components/marketing/social-proof-notifications.tsx` | Delete |
| `components/marketing/dotted-grid.tsx` | Unused after how-it-works change — can keep |
| `lib/marketing/homepage.ts` (or similar) | Rotating text copy, service data |
| Testimonials data source | Rewrite copy, remove occupation from display |
| `components/patient/panel-dashboard.tsx` | Status pills, empty state, profile todo |
| `components/patient/stat-grid.tsx` | Conditional render when all zeros |
| `components/doctor/` queue/review components | Density, status treatment, button variants |

---

## Out of Scope

- Design token changes (Morning Canvas colors are correct)
- Typography system (Source Sans 3 is correct)
- Dark mode (already working)
- Component library (shadcn primitives are correct)
- Auth, payments, clinical logic
