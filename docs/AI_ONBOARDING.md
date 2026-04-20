# AI Onboarding — InstantMed

> **If you're an AI assistant (Claude, Cursor, Copilot) about to touch UI in this codebase, read this first.** ~5 min read. Saves hours of drift.

## The 5 files that embody this design system

Read (or re-read) these before touching any `.tsx` / `.css` in `app/` or `components/`. They're the **law**.

1. **`docs/DESIGN_SYSTEM.md`** — colour tokens, typography scale, spacing, elevation (solid depth, sky-toned shadows), hero variants, motion canon, voice, do/don't. This is the single source of truth.
2. **`lib/motion/index.ts`** — timing, easing, variants (`fadeUp`, `stagger`). No spring physics. 200ms default. Never `initial={false}` — use `initial={{}}` for reduced motion.
3. **`lib/services/service-catalog.ts`** — canonical service definitions (title, subtitle, price, `iconKey`, `colorToken`, route). Every service surface reads from here. Do not inline definitions in consumer components.
4. **`components/icons/service-icons.tsx`** — `ServiceIconTile` primitive. Renders the canonical gradient-tile pattern. Default `variant="tile"`. Use `variant="sticker"` ONLY for playful marketing contexts.
5. **`components/ui/heading.tsx`** (Phase 1, TBD) — `<Heading level>` primitive with baked-in typography scale. Avoid hand-rolling `<h1 className="text-[48px] font-light tracking-[-0.03em]">`.

Bonus: **`lib/design-system/version.ts`** — current `DESIGN_SYSTEM_VERSION`. If you're adding something breaking, bump it and update `docs/DESIGN_SYSTEM_CHANGELOG.md`.

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

- **`GlassCard` is a misnomer.** Despite the name, it's NOT glass — it uses solid backgrounds. Renaming to `SolidCard` is tracked in Phase 2. For now, use the primary solid-depth className pattern (rule 5) directly instead.
- **ServiceIconTile with `iconKey: "FileText"`** renders a tile by default — not a sticker — since v1.0.0. To get a sticker, explicitly pass `variant="sticker"`.
- **`/request` renders client-side** and had a visible empty-white-card flash during hydration. A skeleton was added in Phase 1 (if implemented by the time you're reading this). If not, add one.
- **Custom shadow arbitraries in legacy files** (`onboarding-flow.tsx`, `consult-flow-client.tsx`, several `components/ui/*`) are being swept in Phase 2. Don't copy their pattern.
- **The /consult hero trust row** had duplicate "Full refund if we can't help" copy — fixed in v1.0.0. If you see it again, it regressed.

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
- [ ] `docs/DESIGN_SYSTEM_CHANGELOG.md` updated if a token or surface pattern changed
- [ ] `CLAUDE.md` satellite-doc table updated if a new domain doc was added

---

**Last updated:** 2026-04-20 (design system v1.0.0 pin). Updates should be co-commited with any meaningful design-system change.
