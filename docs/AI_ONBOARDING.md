# AI Onboarding — InstantMed

> **If you're an AI assistant (Claude, Cursor, Copilot) about to touch UI in this codebase, read this first.** ~5 min read. Saves hours of drift.

## The canonical primitives (use these, don't hand-roll alternatives)

Read (or re-read) these before touching any `.tsx` / `.css` in `app/` or `components/`. They're the **law**.

1. **`docs/DESIGN_SYSTEM.md`** — colour tokens, typography scale, spacing, elevation (solid depth, sky-toned shadows), hero variants, motion canon, voice, do/don't. Single source of truth.
2. **`docs/BUSINESS_PLAN.md`** — current business strategy: specialised one-off services, solo-doctor scale, no pharmacy fulfilment, no subscriptions in this phase.
3. **`docs/ADVERTISING_COMPLIANCE.md`** — Google/AHPRA/TGA acquisition rules. Required before editing ads, landing-page copy, metadata, schema, or service claims.
4. **`docs/SEO_CONTENT_POLICY.md`** — organic educational content rules, especially for prescription/medicine pages.
5. **`lib/motion/index.ts`** — timing, easing, variants (`fadeUp`, `stagger`). No spring physics. 200ms default. Never `initial={false}` — use `initial={{}}` for reduced motion.
6. **`lib/services/service-catalog.ts`** — canonical service definitions (title, subtitle, price, `iconKey`, `colorToken`, route). Every service surface reads from here. Do not inline definitions in consumer components.
7. **`components/icons/service-icons.tsx`** — `ServiceIconTile` primitive. Default `variant="tile"`. Use `variant="sticker"` ONLY for playful marketing contexts.
8. **`components/ui/heading.tsx`** — `<Heading level>` primitive with baked-in typography scale (display / h1 / h2 / h3). **Mandatory** for every section heading. Hand-rolled `text-3xl font-semibold tracking-tight` is design drift. Accepts `as` prop to decouple visual hierarchy from semantic element.
9. **`components/marketing/hero.tsx`** — `<Hero>` primitive with slot props (title, pill, primaryCta, secondaryCta, beforeCta, mockup, trustRow). All marketing-page heroes use this; bespoke hero files were retired in the 2026-04-28 sweep.
10. **`components/sections/cta-banner.tsx`** — `<CTABanner>` final-CTA primitive. Refund line auto-renders from `GUARANTEE` constant (`lib/marketing/voice.ts`). Optional `price`, `microcopy`, `onCtaClick`, `isDisabled` props for service pages.
11. **`components/sections/faq-section.tsx`** — `<FAQSection>` shared FAQ pattern. Bespoke `EDFAQSection` / `HairLossFAQSection` / `PrescriptionFAQSection` etc. were retired in the same sweep.
12. **`components/marketing/sections/time-comparison-viz.tsx`** — `<TimeComparisonViz>` race-track primitive (us-vs-GP-clinic time saved). Used by every service page that has a time-comparison moment.
13. **`components/marketing/sections/service-claim-section.tsx`** — `<ServiceClaimSection>` page claim anchor. Claims must be evidence-backed and compliant with `docs/ADVERTISING_COMPLIANCE.md`.
14. **`components/sections/section-header.tsx`** — `SectionHeader` (title + pill + animated WordReveal entrance). Title className is kept in lockstep with Heading h1 spec. Used by FeatureGrid / ProcessSteps / FAQSection / IconChecklist / Timeline / ComparisonTable / AccordionSection — and through them, most marketing pages.

Bonus: **`lib/design-system/version.ts`** — current `DESIGN_SYSTEM_VERSION` (1.1.0 as of 2026-04-28). Bump and update `docs/DESIGN_SYSTEM_CHANGELOG.md` on breaking changes.

## Top 10 rules of thumb

1. **Use tokens, not arbitraries.** `shadow-md shadow-primary/[0.06]` not `shadow-[0_4px_20px_rgba(0,0,0,0.06)]`.
2. **No black shadows.** Ever. Sky-toned (`shadow-primary/[0.0X]`) only. Applies to light AND dark mode equivalents.
3. **No purple/violet** anywhere except `--service-referral`. Hair loss is `amber`, not violet. The design system §1 contradicts §7 historically — §1 wins. See `DESIGN_SYSTEM_CHANGELOG.md` v1.0.0.
4. **No glass morphism on content surfaces.** `backdrop-blur` is only permitted on functional overlays (sticky mobile CTA bars, nav menus, modal overlays). Never on cards/sections.
5. **Solid depth always.** `bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]`. Memorise this. It's the default card.
6. **Motion:** entrance is `fadeUp`, entrance uses `easing.out`, panels/drawers use `easing.panel`. Duration caps at 250ms (`duration.slower`). Whilehover scale caps at 1.02 for elements, 1.1 for icons. No elastic, no parallax.
7. **Reduced motion:** always respect. Use `const prefersReducedMotion = useReducedMotion()` and `initial={prefersReducedMotion ? {} : { ... }}`. Never `initial={false}` (invalid prop).
8. **Portal exception:** doctor portal (`app/doctor/`) and admin portal (`app/admin/`) get NO decorative motion. Time-pressure surfaces. `transition-colors` only.
9. **16px min body on patient flows.** Non-negotiable. Patients are often anxious.
10. **Service definitions:** update `lib/services/service-catalog.ts`, not consumers. If you're adding a new service, update the catalog AND these consumers: home (`lib/marketing/homepage.ts`), intake hub (`service-hub-screen.tsx`), pricing (`pricing-client.tsx`), nav dropdown, mobile menu.

## Common gotchas (already-tripped mines)

- **`GlassCard` is a misnomer.** Despite the name, it's NOT glass — it uses solid backgrounds. Use the primary solid-depth className pattern (rule 5) directly.
- **ServiceIconTile with `iconKey: "FileText"`** renders a tile by default — not a sticker — since v1.0.0. To get a sticker, explicitly pass `variant="sticker"`.
- **All marketing-page heroes use the canonical `<Hero>` primitive** (rule 6). Bespoke hero files (`med-cert-hero.tsx`, `prescriptions-hero.tsx`, `ed-hero.tsx`, `hair-loss-hero.tsx`) were retired in the 2026-04-28 sweep. Don't create new ones — extend `<Hero>` slot props instead.
- **All marketing-page final CTAs use `<CTABanner>`** (rule 7). Bespoke `ServiceFinalCTA` was retired. Refund line auto-renders from `GUARANTEE` constant — don't hardcode "Full refund if we can't help" text inline.
- **All race-track time-comparison sections use `<TimeComparisonViz>`** (rule 9). Bespoke `CertComparisonViz` / `PrescriptionComparisonViz` / `EDComparisonViz` / `HairLossComparisonViz` were retired.
- **All FAQ sections on marketing pages use `<FAQSection>`** (rule 8). Bespoke `EDFAQSection` / `HairLossFAQSection` / `PrescriptionFAQSection` were retired.
- **`GUARANTEE` is outcome-only** ("Full refund if our doctor can't help."), not time-bound. The previous "Doctor reviews in 2 hours or we waive the fee" version was retired 2026-04-28 because it created operational risk on slow days. Don't reintroduce time-bound refund language.
- **Voice wedge is now service-specific.** Default `WEDGE` is form-first/no-waiting-room. `MED_CERT_WEDGE` is the only approved "No video. No call. No appointment." phrase, and only for medical certificate surfaces. Prescription and specialty services use form-first copy.
- **InstantMed is specialised services, not broad online GP.** Do not make homepage or nav copy drift into "speak with a doctor about anything" as the brand promise. General consult is a fallback pathway.
- **Do not use prescription drug pages as paid destinations.** Educational prescription SEO pages can exist, but paid ads route to service-level pages only.
- **Brand-surfaces smoke spec** (`e2e/brand-surfaces.smoke.spec.ts`) verifies `GUARANTEE` literal renders on every brand surface. If you change voice canon, update the test's `GUARANTEE_LITERAL` constant in the same commit.
- **Em-dashes (U+2014) are banned from marketing surfaces.** `voice-guard.test.ts` enforces three layers: literal U+2014, JS escape, and HTML entities (`&mdash;` / `&#8212;` / `&#x2014;`). Use commas, periods, colons, or parens.
- **Patient counter is honest, not inflated.** `lib/social-proof/index.ts` ANCHOR_COUNT recalibrated 3,000 → 500 (April 11 launch), TARGET_COUNT 8,000 → 2,500 (Dec 31). Defensible against the current 3-review GBP base. Don't bump unless real Supabase data exceeds the floor.

## When you're in doubt

1. Can I find this in `docs/DESIGN_SYSTEM.md`? Do that.
2. Is there an existing primitive (`Button`, `Card`, `ServiceIconTile`, `SectionPill`, `RadioGroupCard`)? Use it.
3. Is a Tailwind arbitrary (`shadow-[...]`, `text-[12px]`, etc.) tempting? Pause. 90% of the time there's a canonical class that does it.
4. Is the change touching motion? Read `lib/motion/index.ts` — never hardcode durations/easings.
5. Still stuck? Prefer "do nothing" over "invent a new system." Flag it for a human.

## Don't do these

- Don't add a new "GlowCard" / "FancyCard" / "PremiumCard" variant. Extend `Card` or use `ServiceIconTile`.
- Don't rename `middleware.ts` to `proxy.ts` (Next 16 only; we're on 15.5).
- Don't run `pnpm add react@latest` / `next@latest` / `framer-motion@latest`. Stack is pinned. Read `CLAUDE.md` Stack Pin Policy.
- Don't invent new colour tokens on the fly. Extend `serviceColorConfig` with an intentional addition (and a changelog entry).
- Don't animate `width` / `height` / `top` / `left` / `margin`. Transform + opacity only.
- Don't add `--turbopack` / `--turbo` flags.

## Ship checklist (before you call it done)

- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test` passes
- [ ] Visual check in BOTH light and dark mode at desktop AND mobile
- [ ] Reduced-motion toggle exercised on any new motion
- [ ] `docs/ADVERTISING_COMPLIANCE.md` checked for any public acquisition copy, metadata, schema, or SEO change
- [ ] `docs/SEO_CONTENT_POLICY.md` checked for prescription, medicine, symptom, or condition pages
- [ ] `docs/DESIGN_SYSTEM_CHANGELOG.md` updated if a token or surface pattern changed
- [ ] `CLAUDE.md` satellite-doc table updated if a new domain doc was added

---

**Last updated:** 2026-04-28 (design system v1.1.0 + marketing-page sweep complete). Updates should be co-commited with any meaningful design-system change.
