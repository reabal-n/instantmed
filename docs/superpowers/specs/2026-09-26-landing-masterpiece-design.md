# Landing pages premium redesign: homepage, medical certificate, prescriptions

**Status:** Draft for Rey's review (2026-09-26)
**Supersedes:** `docs/superpowers/plans/2026-09-26-landing-premium-heroes.md` (heroes-only plan, never executed)
**Evidence base:** `docs/research/2026-09-26-premium-health-landing-pages.md` (six-stream research report with 240 citations) and the browser audit summarised in Section 3.

## 1. Goal

Make `/`, `/medical-certificate` and `/prescriptions`, plus the shared header, menus and footer, look and feel like a category-leading product that a first-time patient trusts in seconds and that friends and family would call impressive. The pages must stay calm for an unwell, anxious visitor on a phone, keep every compliance line, and convert at least as well as today.

### Success criteria

| Measure | Today | Target |
|---|---|---|
| Hero copy (excluding H1, visual, status line and proof row) | 28 to 73 words | 38 words or fewer on all three pages (the moat badges are the most valuable words in the hero) |
| Visible words per page, excluding FAQ answers, "More detail" content, SEO link lists ("Common reasons", "Learn more"), chrome and footer | about 520 to 670 | homepage 420 or fewer, medical certificate 480 or fewer, prescriptions 440 or fewer. The research puts best-converting health pages at 355 to 1,020 words; today's words are mostly prose, and the new ones are mostly scannable labels and chips. |
| Reading level of new copy | mixed, legal in places | about grade 6 (plain English) |
| Lab LCP, `/medical-certificate`, 4x CPU and Fast 4G, 390x844 | 680 ms, CLS 0 | 800 ms or lower, CLS 0 |
| Lighthouse accessibility, best practices, SEO (mobile) | 100, 100, 100 | 100, 100, 100 |
| Hero CTA click-through and canonical `intake_started` per landing session | baseline from the 14 days before release | no drop greater than 10% per route over 14 days after release (a larger drop reopens that page) |
| Template tells present (see Section 5.8) | 11 | 0 |

The last row is judged by eye against Section 5.8, not by a tool.

## 2. Decisions already made (Rey, 2026-09-25 and 2026-09-26)

1. LegitScript and Google certification marks render in every hero (PR #608, merged).
2. Warmth comes from a **custom illustration and mark set that Claude draws as SVG**, not stock icons or restored stickers. Rey approves four pieces before the rest are drawn.
3. The hero visual combines **the real outcome on a phone** with a **status story** (received, checked, sent). Claude chooses the composition.
4. Motion: **crafted and calm**, plus a restrained desktop moment in How it works. No scroll-jacking and nothing looping forever.
5. Copy: **lean and layered.** Detail moves behind "more" controls that stay in the page for search engines.
6. The homepage H1 stays **"Faster than your GP."** with a live wait time and a **glowing green indicator** that shows doctors are online. The indicator must be truthful (Section 6.1).
7. The header, Services menu, mobile menu and footer are redesigned as part of this work.
8. The other service pages (ED, hair loss, women's health, weight, SEO guides, `/request`) follow in a separate plan. They pick up the new marks, colours and chrome automatically through shared components.
9. The three pages ship together **after the 7 October Google Ads checkpoint.** Straight bug fixes (Section 9) may ship earlier with Rey's OK.
10. **Trust builders (Rey, 2026-09-26):**
    - a specimen certificate viewer and a verify demo
    - a "Who checks your request" panel
    - three possible outcomes
    - a contact line and "What you'll need"
    - the LegitScript and Google certification logos, prominent in each page's trust section as well as the hero and footer, because patients recognise them
11. **Polish (Rey, 2026-09-26):**
    - share previews and a browser tint per page
    - the typographic finish pack
    - tactile surfaces
    - a condensing desktop header
12. **Safeguards (Rey, 2026-09-26):** a screenshot regression gate and linkable FAQ answers.
13. **Moat badges (Rey, 2026-09-26):**
    - No appointment and no call are InstantMed's main moat and must be prevalent.
    - Every page and service shows the green pair **"No appointment" + "No video call"**. Medical certificates show **"No call needed" + "No appointment"**.
    - Prescribing and specialty copy says "A doctor reviews your form and only calls if something needs checking."
    - Rey approves this context as the clinician and Medical Director, under `docs/VOICE.md` rule 3, noting doctor calls in only about 2 of several hundred requests. The evidence is recorded in the claims registry (Section 6.7).
    - The only wording still off-limits on prescribing pages is an unqualified "No call needed".

## 3. What is wrong today (audit, 2026-09-26)

Measured on production at 1440x900 and 390x844, with the pre-#599 build rebuilt locally for comparison.

- **Sterile and generic.** Every icon is a thin, monochrome blue lucide line. The homepage services section is six identical rounded cards, each topped by one of those icons. The research names that grid as a leading template and AI tell. DESIGN.md section 7 still requires `ServiceIconTile`, so the current cards also break the project's own design rules.
- **Text-first heroes.** The home hero visual is a 70-word letter and the prescriptions visual is a 49-word message card. The medical-certificate "specimen" costs about 1.2 phone screens of scrolling. The pre-#599 certificate was a better-designed document; the current one is prose.
- **Thin, bland headline.** The display face is set at weight 300. Every measured competitor headline uses 430 to 700.
- **Inconsistent layout.** Container widths vary between `max-w-5xl` and `max-w-6xl` with different left edges, and sections alternate between centred and left-aligned. There are cards inside cards, eyebrow pills on prescriptions only, and CTA buttons in two shapes (`rounded-full` on the certificate final CTA, `rounded-lg` elsewhere).
- **Broken or wrong.**
  - `limitations-section.tsx:25` says "Extended absences beyond 3–5 days" when the maximum is 3 days.
  - The Services dropdown has a pale yellow, blurred panel (`services-dropdown.tsx:76`).
  - The prescriptions FAQ shows both "Show all 9 questions" and "View all questions".
  - The employer logo marquee pauses only on hover, so touch users cannot stop it (WCAG 2.2.2). It also reads as a fake "trusted by" strip and uses bank and retailer trademarks.
  - "More certificate guidance" is an unstyled native disclosure.
  - Two lazy images have no dimensions.
- **Healthy foundations.** Lighthouse scores 100 for accessibility, best practices and SEO on both service pages. LCP is 680 ms with zero layout shift. The redesign must keep this.

## 4. Approach

**Morning worlds.** Keep the ivory and system-blue foundation. Give each service its own colour world from the morning palette, draw an owned illustration and mark set in that palette, and make every hero show the real outcome on a phone with a truthful status story. Precision in layout, type and interaction supplies the "high production" feel, rather than effects.

Two approaches were rejected:
- **Product-first minimal** (Linear, Stripe): very premium, but it deepens the sterility Rey rejected.
- **Editorial warm** (serif, cream, photography): it conflicts with DESIGN.md typography, cream-plus-serif is now a known AI default, and it needs a photo shoot.

## 5. Design system changes

### 5.1 Colour worlds

The foundation stays: warm ivory canvas, pure white surfaces, sky-toned shadows, system blue `#2563EB` as the only CTA colour. Add service tints as CSS custom properties in `app/globals.css` with dark-mode counterparts.

| World | Used by | 50 (band) | 100 (tile) | 200 (fill) | Notes |
|---|---|---|---|---|---|
| Dawn | Medical certificate | `#FFF6EE` | `#FDE8D6` | `#F5C6A0` (morning peach) | Warm, "morning in bed" |
| Sky | Repeat prescription | `#F2F7FE` | `#DDEAFB` | `#BAD4F5` (morning sky) | Calm, routine |
| Spectrum | Homepage | sky to peach gradient, hero and bands only | | | Brand overview |
| Dusk | ED (cards and menu only) | `#F1F4F9` | `#E1E7F1` | `#C7D2E3` | Private, dimmer, never indigo |
| Champagne | Hair loss (cards and menu only) | `#FBF7EE` | `#F5EBD5` | `#E8D5A3` (morning champagne) | |
| Rose | Women's health (cards and menu only) | `#FDF3F4` | `#FAE3E6` | `#F2C4CB` | Not pink-500; soft, warm |
| Sage | Weight management (cards and menu only) | `#F3F7F3` | `#E3EDE4` | `#C6D9C9` | New neutral green |

Rules:
- Tints are backgrounds and illustration fills only. Meaning is always carried by ink lines and text.
- Tiles get a hairline border (`border-black/5`, `dark:border-white/10`), because tints reach only about 1.4:1 against ivory.
- Coral `#FF6B5B` is a decorative accent inside illustrations only. It reaches 2.6:1 on ivory, so it never carries meaning alone and never appears on the homepage outside illustrations (existing contract).
- Resolve the primary-blue conflict: `DESIGN.md` lists `#3B82F6`, `app/globals.css` uses `#2563EB`. `#2563EB` is canonical, because it passes 3:1 on the sky tile and `#3B82F6` does not. Update DESIGN.md and add a contract test that pins the token value.
- Replace `serviceColorConfig` gradients with the world tokens. Remove the indigo exception from DESIGN.md section 7.

### 5.2 Illustration and mark system ("Morning marks")

Everything is drawn by Claude as hand-authored SVG React components in `components/brand/illustrations/` and `components/brand/marks/`. Nothing is traced from stock, and no AI raster is involved, so InstantMed owns the work outright.

**Style**
- One rounded line: stroke 1.75 units on a 48-unit mark grid, and the same visual weight on the 320x240 scene grid. Round caps and joins, a 2-unit corner radius on rectangles.
- Ink line `#1E293B` (light) and `#E2E8F0` (dark), via a CSS variable.
- Fills come from the owning world's 100 and 200 tints, plus white highlights at 90%.
- At most one coral detail per piece (a dot, seal or spark), decorative only.
- Simple geometric objects. No people, faces or hands; no pills, capsules, syringes, pens or medicine packs; no medicine names; no stethoscopes or white coats (BRAND.md photography rules applied to illustration).
- Every piece has a light and a dark variant through CSS variables, not duplicated files.

**Marks (6)**, shown on 40, 48 or 56 px world tiles:
- Certificate: a document with a folded corner and a seal.
- Repeat prescription: a phone with a circular repeat arrow and a token chip.
- ED: a private chat bubble with a small lock. Deliberately not symbolic; no bolt, no eggplant, no arrow.
- Hair loss: a comb with three strands.
- Women's health: a calendar ring with a leaf, for cycle and care.
- Weight management: a simple balance with a level beam. No tape measure, body outline or scale readout.

**Scenes (12)**, used at most once per section:
1. Form on phone
2. Clinical check: a clipboard, a checklist and a seal marked AHPRA as a generic badge, not the AHPRA logo
3. Certificate arrives: an envelope with a document card and a link glyph
4. Verify: a document, a QR-like mark and a check
5. eScript message: a phone with a message bubble and a token card
6. Pharmacy: a generic shopfront awning with a cross sign, no brand
7. Around the clock: a sun and moon on one dial
8. Privacy: a lock on a folder
9. Refund: a card with a return arrow
10. ID card: a generic card with lines, no Medicare branding
11. Calendar: days 1, 2 and 3 highlighted
12. Australia: a map pin on a simplified outline

**Proof gate:** the certificate mark, the repeat-prescription mark, scene 1 and scene 3 are drawn first and shown to Rey at 1x and 2x in light and dark before any other piece is drawn.

### 5.3 Typography

- Display (hero H1 only): Plus Jakarta Sans at **weight 450** (from 300), tracking `-0.035em`, line height 1.02 to 1.05, one ink colour. The blue accent phrase added in #608 is removed; the research lists highlighted accent phrases as a template tell. The final weight is tuned between 400 and 500 in the proof gate.
- Update `components/ui/heading.tsx` (`font-light` to a `font-[450]` token) and DESIGN.md's type table in the same change.
- Hero H1s must never render in the Arial fallback. The two route subsets (`home-h1`, `money-h1`) stay preloaded and must use `display: "swap"` (`money-h1` is currently `optional`). Regenerate subsets if any H1 text changes.
- H2 stays Source Sans 3 semibold 30/36 with tightened tracking. Section intros are 18 px muted. Body is 16 px. Prices use `tabular-nums`.
- Sentence case everywhere. No all-caps eyebrows except the small "SPECIMEN" or "EXAMPLE" label inside visuals.

### 5.4 Layout and rhythm

- One container: `max-w-6xl` with `px-5 sm:px-6 lg:px-8`. Every section shares one left edge. Section headings are left-aligned; only the final CTA band is centred.
- Vertical rhythm: `py-16 md:py-24` for major sections, `py-12 md:py-16` for compact ones.
- Surface sequence per page: ivory, then a white band, then a world band (a soft 50-tint gradient), then ivory. No card nested inside another card.
- Mobile first at 390x844, verified at 320x640 and 1440x900.

### 5.5 Motion system

Tokens come from `lib/motion/index.ts`. CSS-first; Framer Motion only where it is already used. Any new Framer usage uses `LazyMotion` with `m`.

| Moment | Behaviour | Duration and easing | Reduced motion |
|---|---|---|---|
| Hero stage entrance | phone rises 12 px and fades from 0 | 280 ms, ease-out `[0, 0, 0.2, 1]` | final state at first paint |
| Status story | three checks tick in sequence (scale 0.85 to 1 plus colour) | 180 ms each, starting at 450, 750 and 1050 ms | all checks shown ticked |
| Delivery notice | slides 12 px and fades | 220 ms at 1250 ms, strong-out `[0.23, 1, 0.32, 1]` | shown |
| Live status dot | soft green glow breathes three times, then stays lit | 3 x 1.6 s (4.8 s, within WCAG 2.2.2's five-second limit) | static glow |
| Buttons | press scale 0.98; hover lift 1 px with a deeper shadow; arrow nudges 2 px | 100 ms press, 150 ms hover | colour change only |
| Cards and service rows | hover lift 2 px with a shadow; press 0.99 | 180 ms | colour change only |
| How it works (desktop, `lg` and up) | sticky illustration column; the active step's scene crossfades with an 8 px rise as each step crosses 40% of the viewport; the step number fills | 240 ms | static, scenes inline |
| How it works (mobile) | each step shows its own scene inline; no scroll-linked motion | none | none |
| Duration picker | selected card border and tint transition; CTA price crossfades | 150 ms | instant |
| FAQ accordion | `grid-template-rows` 0fr to 1fr | 220 ms | instant |
| Menus | Services panel scales 0.98 to 1 from its trigger; mobile sheet slides | 180 ms; 220 ms in and 160 ms out | instant |

Rules:
- The H1 and subheading are never faded, because opacity-0 paints delay LCP.
- No scroll-fade reveals on content. `Reveal` is removed from these pages, following NN/g's mobile guidance.
- Nothing loops except the bounded glow above.
- DESIGN.md corrections in the same change:
  - `initial={false}` is valid in Framer Motion 11 and the preferred way to skip a mount animation.
  - Scroll-triggered fades are not a default on mobile.
  - Large transitions may run 300 to 400 ms when they carry spatial meaning.

### 5.6 Copy system

- Plain English at about grade 6. H1 of 9 words or fewer, subheading of 20 words or fewer, section intros of 18 words or fewer, chips of 7 words or fewer.
- Every approved-claims string is used through `getApprovedClaim()` or `lib/marketing/voice.ts`. No retyping.
- CTA labels name the next step and carry the price on service pages ("Get your certificate · From $24.95").
- Detail that exists today but is not needed to decide moves behind a "More detail" disclosure (native `details`, styled) that remains in the DOM.
- **New short approved claim.** Add `clinical_review_sequence_short` to `lib/marketing/approved-claims.ts` with CLINICAL.md receipts, for use in How it works steps:

  > "A doctor or our doctor-approved clinical protocol checks your request. Every prescription needs a doctor's decision."

  The existing long `clinical_review_sequence` stays in "More detail". Update `canonical-trust-copy-contract` to accept either. This goes through `instantmed-marketing-compliance-review` and `instantmed-clinical-safety-review` before use.
- Certificate copy must not say that a doctor reviews every request. Standard certificates can issue under the Medical Director protocol.

### 5.7 Proof devices (no testimonials)

- ProductReview logo and stars (linked, no count).
- LegitScript seal and Google Online Pharmacy Certification.
- Live wait median (real data only).
- The status story.
- The verify mechanism.
- "What we won't do".
- The refund policy, stated as policy.

### 5.8 Template tells to eliminate (checklist for review)

1. Identical icon-card grids
2. Thin monochrome line icons as decoration
3. Blue accent phrase in headlines
4. All-caps eyebrow labels above headings
5. Middle-dot fact strings (for example "Australia only · Ages 18+") in body copy. Chips replace them; the CTA price separator " · " stays because a contract requires it.
6. An arrow on every link. Arrows only on primary actions.
7. Auto-scrolling logo marquee
8. Scroll-fade reveals on every section
9. Stat rows
10. Cream-plus-serif. Not introduced; ivory stays, and colour worlds and illustrations carry warmth.
11. Generic "Get started" as the homepage's main action

### 5.9 Polish pack

- **Typographic finish:**
  - `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs.
  - A `nbsp` helper keeps "$24.95", "3 days", "24/7" and "about 3 minutes" unbroken.
  - Curly quotes and apostrophes in every string authored for this redesign. Approved-claims strings stay byte-identical, because contracts match them exactly.
  - `tabular-nums` on prices and times.
  - A branded `::selection` colour (primary at 18%).
  - One focus-ring token: 2 px primary with a 2 px offset, and a teal variant in dark mode.
  - `scroll-margin-top` on every anchor target, so in-page links land below the sticky header.
- **Tactile surfaces:**
  - 2 to 3% SVG film grain on hero and world-band gradients only (1 to 2% in dark mode). This is DESIGN.md's permitted hero noise, and it also prevents gradient banding.
  - A 1 px inset top highlight on buttons and cards, and the pressed-state highlight flip from DESIGN.md section 12.
- **Share previews:**
  - Redesign `app/opengraph-image.tsx` and `app/medical-certificate/opengraph-image.tsx`, and add `app/prescriptions/opengraph-image.tsx`.
  - Each is 1200x630 in its colour world, with the page's mark, H1, moat badge and wordmark, and no people or medicine. `app/api/og/route.tsx` keeps serving other routes.
- **Browser tint:**
  - A per-route `viewport.themeColor`: homepage ivory `#F8F7F4`, certificate dawn 50, prescriptions sky 50, with dark-mode variants.
  - This replaces the global `#3B82F6` in `app/layout.tsx`.
- **Condensing header (desktop, `lg` and up):**
  - Once the hero leaves the viewport (IntersectionObserver on `[data-hero]`), the header slims from 64 to 52 px and reveals a compact CTA carrying the page's price.
  - 200 ms; instant under reduced motion. Mobile keeps the sticky bottom CTA instead.

## 6. Shared components

### 6.1 `LiveStatus` (new; replaces the hero's `WaitCounter` placement)

A quiet line above the H1: a green dot with a soft glow, then text.

**States, decided server-side:**

| State | Condition | Text |
|---|---|---|
| `online` | at least one clinician profile with `doctor_available = true` **and** doctor-attributed review activity in the last 90 minutes (a manual approval, decline, information request or script sent by a clinician; certificates with `activity_provenance: "auto_issued"` do not count) | "Doctors online" |
| `online` with median | as above, and the existing wait-counter median passes its current stale-data and queue-pressure guards and is under an hour for that service | "Doctors online", a thin vertical rule, then "Certificates: median ~16 min over the last 24 hours" (the rule is a visual divider, not a middle dot) |
| `open` | the online conditions fail | "Requests open 24/7" (static dot, no glow). Never "offline" or any hours window. |
| `hidden` | maintenance mode or the service is disabled | nothing |

- The median line appears only for medical certificates. It shows on the homepage and on `/medical-certificate`. Prescriptions show "Doctors online" without a median, because the prescription median is hours, not minutes.
- **Data:**
  - `getLiveStatus()` in `lib/brand/live-status.ts` composes `getWaitState()` with a service-role count of available clinicians. It returns a boolean, never a count.
  - It is cached for 60 seconds.
  - It uses the existing seeded-E2E exclusion.
- **Compliance:**
  - "Doctors" is the approved generic plural. No count or name is ever shown.
  - Update `marketing-copy-contract` to allow "Doctors online" only inside `LiveStatus`. It must continue to ban "right now", "is reviewing" and "are reviewing" everywhere.
  - Add the rule to BRAND.md section 6.1 and to DESIGN.md hero rules.
- **Tests:** unit tests for every row of the table, including a stale availability flag with no recent completions (shows `open`) and a failed data query (shows `open`, never `online`).

### 6.2 `OutcomeStage` (new; the hero visual)

A composition of three layers in a `<figure data-hero-facsimile>` with a screen-reader `<figcaption>` stating it is an example.

1. **A code-built phone.** A graphite device frame (a device colour, not a page background). The screen is laid out at 390 px and scaled with container-query units, so it stays sharp at every size. The screen content is `aria-hidden`.
2. **A status card** floating at the phone's lower left on desktop, and below the phone on mobile. It lists three steps with check marks.
3. **A delivery notice** floating at the upper right.

A world backdrop sits behind: a soft radial "sun" in the world tint, made from gradients with no blur filters. Screens mirror the real delivered formats, verified against a redacted real example before build, and are labelled "Example".

| Variant | Screen | Status steps | Notice |
|---|---|---|---|
| `certificate` | the patient dashboard card "Your medical certificate is ready": a document thumbnail with the SPECIMEN mark, the absence dates, a "Download PDF" button and the verification reference. Locked PDF wording where text is legible. | Form received, Clinical check, Certificate ready | Email: "Your certificate is ready to view" |
| `escript` | iOS lock screen on a morning-sky wallpaper, with one message in the verified real eScript SMS format and no medicine name | Form received, Doctor review, eScript sent | none (the message is the notice) |
| `home` | the certificate screen | the certificate steps | Message: "Your eScript is ready" |

- No timestamps like "now" or "2 min ago", because they imply turnaround.
- No patient photo. The synthetic name is "Alex Taylor", as today.

### 6.3 `Hero` (modified)

- Anatomy: `LiveStatus`, then the H1, then one subheading, then the page's decision block, then the refund line, then the proof row (ProductReview, a divider, LegitScript and Google). `OutcomeStage` sits on the right on desktop and after the proof row on mobile.
- Decision block:
  - Homepage: a **priced service menu** (three rows, Section 7.1).
  - Service pages: **chips**, then the CTA.
- `beforeCta`, `reassuranceRow`, `showReviews` and `showCertifications` remain for the other pages.
- The mobile first screen keeps the CTA or menu fully inside 812 px (existing e2e).

### 6.4 New section primitives (in `components/marketing/sections/`)

- `SectionHeading`: left-aligned H2 plus an optional intro. No pill, no eyebrow.
- `WorldBand`: full-bleed background in a world's 50 tint, with a subtle top and bottom fade.
- `ChipList`: wrapping chips with an optional mark; "good" and "see a GP" tones use ink text on a tint, with the meaning in the text itself.
- `FitCheck`: two `ChipList` columns ("Good for" and "See a GP instead"), plus an optional note.
- `StepStory`: numbered steps with scenes; sticky scene column on desktop (Section 5.5).
- `DurationPicker`: three tinted cards (1, 2 or 3 days) with prices from `PRICING_DISPLAY`. Selection updates the CTA link through `buildMedCertRequestHref({ duration })` and the price through an `aria-live="polite"` region. It works without JavaScript: each card is a link.
- `FeeCard`: an aligned two-column fee table.
- `FaqSplit`: heading on the left, accordion on the right on desktop; stacked on mobile. Fixes the double link. Keeps the existing homepage FAQ questions (contract-pinned). Each item gets a stable anchor (`#faq-<slug>`). Opening the page with that hash expands and scrolls to the item, and a small "Copy link" button copies it, announcing "Link copied" politely. FAQ schema is unchanged.
- `FinalCtaBand`: a centred band in the page world with the page's `MoatBadgePair`, a heading, one line, the CTA and the refund line.
- `MoreDetail`: a styled `details` for layered copy.

### 6.5 Chrome

- **Header:**
  - Keeps the floating rounded bar, but with a solid white surface and a sky shadow.
  - Items: Services (menu), How it works, Pricing, Contact us, Log in, and a primary "Start a request" CTA.
  - The Services panel is solid white with a sky border. It has two groups. "Most requested" holds the certificate and prescription rows, each with its mark tile, one line and price. "Private assessments" holds the four specialty rows, each with a mark tile.
  - The panel fixes the yellow blurred border.
  - The certificate row carries `MoatBadge claim="no-call"` (sm); in the mobile menu too.
- **Mobile menu:** a full-height sheet with the same grouped service rows (marks and prices), then the secondary links, then a pinned CTA. 48 px targets.
- **Footer:**
  - One unboxed layout.
  - A brand block: logo, "Telehealth without the small talk.", support email and phone, "24/7 voice message support".
  - Columns for Services, Help, About and Legal.
  - A trust row: Stripe, LegitScript, Google, and AHPRA-registered doctors as text.
  - The emergency line, then ABN and copyright, with the theme toggle.
  - The redundant three-chip row ("AHPRA-registered doctors · Refund if declined · Privacy Act protected") is removed; those points live in the page trust sections.
- **Sticky mobile CTA** on the service pages: 88 px maximum height (from 126), with the price shown. Its summary line becomes the page's moat pair (sm): "No call needed" + "No appointment" on certificates, "No appointment" + "No video call" on prescriptions. On the homepage the sticky bar is **off by default** and becomes a PostHog experiment arm, since the research found sticky CTAs rarely help homepage-type pages.

### 6.6 Trust components (new)

- **`SpecimenViewer`**
  - The hero phone's certificate card (and a "See the full certificate" link) opens an accessible dialog with a large, zoomable specimen image.
  - The image is generated at build time from the real template by `scripts/generate-certificate-specimen.ts`, through `lib/pdf/template-renderer.ts`, using synthetic data.
  - Forgery safeguards:
    - a repeated diagonal "SPECIMEN · NOT A VALID CERTIFICATE" watermark
    - no signature image, no provider or prescriber number, and reference "SPECIMEN"
    - WebP output, 1600 px maximum, lossy
  - Locked PDF wording throughout. The dialog has a heading and alt text, and closes with Escape or the close button, returning focus.
- **`VerifyDemo`**
  - An inline card labelled "Example", with a read-only reference field ("IM-SPECIMEN") and a "Check" button.
  - Pressing it reveals a static example result:
    - `employer_verify_authenticity`
    - "Valid certificate"
    - the issue date
    - `employer_privacy_limited`
  - It never calls the API. The link "Check a real certificate" goes to `/verify`.
- **`ClinicalModelPanel` ("Who checks your request")**
  - Three rows with marks:
    1. Simple medical certificates: checked against a doctor-approved clinical protocol.
    2. Anything concerning or uncertain: reviewed by an AHPRA-registered doctor.
    3. Every prescription: decided by an AHPRA-registered doctor.
  - A caption, "Clinical governance by our Medical Director", beside a stylised signature mark with no readable name (BRAND.md section 6.2).
  - The row text is added to the approved-claims registry as `clinical_governance_protocol`, `clinical_governance_doctor_review` and `clinical_governance_prescribing`, with CLINICAL.md receipts, after compliance and clinical-safety review.
  - `doctor_registration` sits in "More detail".
  - **Certification logos:** the LegitScript seal, linking to its verification page, and the Google Online Pharmacy Certification mark sit in this panel at 56 px, each with its approved label. A "What is this?" disclosure shows the approved `legitscript_tooltip` and `google_healthcare_ads_tooltip` text, so the marks are explained honestly as advertising and merchant certifications, not clinical endorsements.
- **`OutcomePaths` (three possible outcomes)**
  - The final beat of every `StepStory`. Three small cards, each with a mark:
    - "Approved": delivered digitally (the certificate link by email, or the eScript by text).
    - "More information needed": a doctor may contact you.
    - "Not suitable": `GUARANTEE`, with `refund_payment_process` in "More detail".
  - The "may contact" wording counts toward the landing caveat budget of two per file.
- **`ContactLine`**
  - "Questions before you start? Call 0495 049 555 (24/7 voice messages) or email support@instantmed.com.au."
  - Shown beside every `FaqSplit`. The phone and email come from the existing contact constants.
- **`WhatYouNeed`**
  - A compact checklist beside the primary CTA's section:
    - Certificates: "Nothing to prepare. No Medicare card needed."
    - Prescriptions: "Your medicine's name and dose", "Medicare card or IHI", "Your Australian address". The last two restate `prescribing_identity_required`, which appears verbatim in the fit check.

### 6.7 `MoatBadge` (new primitive: the moat, in green)

InstantMed's structural advantage is stated as one recognisable green badge, used consistently: every service needs no appointment, and suitable certificate requests need no call. The component renders only approved-claims text. It cannot take free text.

| `claim` | Label | Allowed on | Qualifier (in a popover) |
|---|---|---|---|
| `no-appointment` | "No appointment" (`trust_no_appointment_label`) | every service and the homepage | `trust_no_appointment_tooltip`: "Submit any time. No booking, no scheduling." |
| `no-video-call` | "No video call". A new `trust_no_video_call_label` (contexts: platform, medical certificate, prescribing, specialty; risk low). It is literally true: InstantMed does not run video consults. | every service and the homepage | new `trust_no_video_call_tooltip`: "No video consults. A doctor reviews your form and only calls if something needs checking." |
| `no-call` | "No call needed". This is a new `trust_no_call_needed_label` (context `medical_certificate`, risk high) and needs compliance sign-off; if declined, it falls back to the existing approved "No call for simple certs". | medical certificates only | new `trust_no_call_needed_tooltip`: "Suitable certificate requests are handled from the secure form. If something needs checking, a doctor may contact you." |

**New approved supporting line:** `form_first_call_if_needed`, "A doctor reviews your form and only calls if something needs checking."
- Contexts: platform, prescribing, specialty.
- Risk: medium.
- Receipts:
  1. `docs/CLINICAL.md` form-first model.
  2. An aggregate, PHI-free call-rate count: prescribing and specialty requests in the trailing 180 days with a recorded doctor phone contact, against all completed requests. It is pulled during implementation and dated in the claim's notes.
  3. Rey's clinical approval as Medical Director, dated 2026-09-26.
- It replaces `FORM_FIRST_WEDGE` ("...may call you briefly before prescribing") as the lead form-first line on these pages. `FORM_FIRST_WEDGE` stays approved and in the registry.
- `docs/ADVERTISING_COMPLIANCE.md` sections 5 and 6 and the `docs/VOICE.md` service table are updated to list the new approved phrasing. The ban on an unqualified "No call needed" for prescribing stays.

**Guards.** Only the unqualified "No call needed" stays banned on prescribing and specialty pages (`docs/ADVERTISING_COMPLIANCE.md`). "No video call" and the conditional supporting line are allowed everywhere.
- Props form a discriminated union: `{ claim: "no-appointment" | "no-video-call" }` or `{ claim: "no-call"; service: "med-cert" }`.
- A new `moat-badge-contract` test allows `claim="no-call"` only in certificate-scoped files, and fails if it appears in any prescription, ED, hair loss, women's health or weight file.
- The test also checks that both labels resolve through `getApprovedClaim()`.

**Visual**
- **Shape:** a `rounded-full` pill, 26 px tall (sm) or 34 px (md), with 10 or 14 px horizontal padding and a 6 px gap.
- **Surface:** `#ECFDF5` softening to `#E1F8EC` top to bottom, a 1 px `rgba(5,150,105,0.18)` border, the inset top highlight `inset 0 1px 0 rgba(255,255,255,0.8)` and a `0 1px 2px rgba(5,150,105,0.08)` shadow.
- **Glyph:** a solid `#059669` circle with a white check drawn at 2.25 stroke in the mark style. 16 px (md) or 14 px (sm).
- **Text:** Source Sans 3 semibold, 16 px (md) or 14 px (sm), `#065F46` (about 9:1 on the tint).
- **Dark mode:** surface `rgba(6,78,59,0.35)`, border `rgba(52,211,153,0.25)`, text `#A7F3D0`, glyph `#34D399` with a `#022C22` check.
- **Qualifier:** a separate 24 px "i" button next to the badge (not the badge itself) opens the qualifier popover on tap, click or focus. The badge text stays plain text.
- **Motion:** on hero badges only, the check draws once (stroke-dashoffset, 260 ms, 200 ms after first paint). No loop and no glow; the `LiveStatus` dot stays the only glowing element. Static under reduced motion.

**System integration**
- `BADGE_REGISTRY.no_appointment` moves from orange to the moat style.
- `TrustBadge` delegates the `no_call` and `no_appointment` ids, plus a new `no_video_call` id, to `MoatBadge`, so checkout, the About page and CTA banners inherit it.
- A `MoatBadgePair` convenience renders the page's pair (`no-appointment` + `no-video-call`, or `no-call` + `no-appointment` on certificate surfaces) with an 8 px gap, wrapping cleanly at 320 px.
- The styled tier's looping pulsing-dot and X-draw animations for these ids are retired.
- DESIGN.md gains a rule: success green is used for the two moat claims (a stated patient benefit), live status and success states only.

## 7. Pages

Word counts are visible words excluding FAQ answers, footer and chrome.

### 7.1 Homepage (spectrum world), 420 words or fewer

1. **Hero**
   - `LiveStatus` with the certificate median.
   - H1: "Faster than your GP." Before release, add an external substantiation source for the `tagline` claim to `lib/marketing/approved-claims.ts`, for example ABS Patient Experiences GP wait-time data plus InstantMed's own median. Today its only receipts are the brand docs, and the registry rates it medium risk. The paid-safe variant stays the ads default.
   - Subheading: "Medical certificates, repeat scripts and private assessments from AHPRA-registered Australian doctors."
   - `MoatBadgePair`: "No appointment" + "No video call" (md).
   - **Priced service menu**, three full-width rows of 56 px or more, each with a mark tile, a label, a price and a chevron:

     | Row | Price | Link |
     |---|---|---|
     | Medical certificate | From $24.95 | `/medical-certificate` |
     | Repeat prescription | $29.95 | `/prescriptions` |
     | Private assessments | From $49.95 | `#services` |

     Each row carries `data-home-cta` analytics attributes. The certificate row shows `MoatBadge claim="no-call"` (sm).
   - Refund line, then the proof row.
   - Visual: `OutcomeStage variant="home"`.
2. **Services** ("What do you need?")
   - Intro: "Choose a service. The fee is shown before you start."
   - Two featured world cards:
     - Certificate (dawn): mark, "From $24.95", `MoatBadge claim="no-call"` (sm), chips "Work, study or carer's leave" and "No Medicare needed", CTA "Get a certificate".
     - Prescription (sky): mark, "$29.95", `MoatBadgePair` "No appointment" + "No video call" (sm), chips "One regular medicine" and "eScript by text if approved", CTA "Get your repeat".
   - Four compact assessment rows (ED, hair loss, women's health, weight), each with its world mark tile, one line, price and chevron. Data comes from the service catalogue and respects availability.
   - The "One secure form per service" block is removed.
3. **How it works** (`StepStory` on a spectrum band)
   - Step 1: "Fill in a short form". Body: `ICONIC_HOOK` ("Start with a secure form. Takes about 3 minutes."). Scene 1.
   - Step 2: "A clinical check". Body: `clinical_review_sequence_short`, with the long claim in "More detail". Scene 2.
   - Step 3: "Your result, sent digitally". Body: "If approved, your certificate link arrives by email, or your eScript by text." Scene 3.
   - Chips: "About 3 minutes", "Reviewed 24/7", "Digital delivery".
   - Ends with `OutcomePaths`.
4. **"Proper medicine, not a loophole."** (white band). This replaces the government-logo strip.
   - `ClinicalModelPanel`, with the LegitScript and Google logos.
   - One line: "Every certificate has a reference your employer can check at instantmed.com.au/verify." Links to `/verify`.
   - One link: "What we won't do".
5. **FAQ** (`FaqSplit`, the existing six questions), with the `ContactLine`.
6. **Final CTA band** (spectrum): "Ready when you are." / `ICONIC_HOOK` / "Start a request" / refund line.

### 7.2 Medical certificate (dawn world), 480 words or fewer

1. **Hero**
   - `LiveStatus` with the certificate median.
   - H1: "Your medical certificate. Without the waiting room." (kept for launch; a message-matched H1 test against the Google Ads copy follows after launch).
   - Subheading: "For work, study or carer's leave. Issued by AHPRA-registered Australian doctors."
   - Moat row: `MoatBadge claim="no-call"` and `MoatBadge claim="no-appointment"` (md).
   - Chips with marks: "Australia only", "Ages 18+", "No Medicare needed".
   - `MED_CERT_WEDGE` ("No video. No call. No appointment.") moves, verbatim, to be the How it works intro, so the approved line stays on the page without repeating the badges.
   - CTA: "Get your certificate · From $24.95".
   - Refund line, then the proof row.
   - Visual: `OutcomeStage variant="certificate"`. Tapping the certificate opens `SpecimenViewer`.
2. **"Is this right for you?"** (`FitCheck`)
   - Good for: Cold and flu, Gastro, Migraine, Back pain, Period pain, A mental health day, Caring for someone who is sick.
   - See a GP instead: WorkCover or legal matters, More than 3 days off, Needs a physical exam, Ongoing or complex conditions, Emergencies: call 000.
   - Note: "If your request isn't suitable, you get a full refund."
   - This fixes the "3–5 days" error. The duration value comes from `MAX_MED_CERT_DURATION_DAYS`.
3. **"Will my employer accept it?"** (white band, split)
   - Left, three short facts:
     - "Issued by AHPRA-registered Australian doctors."
     - "Each certificate has a reference your employer can check at instantmed.com.au/verify."
     - `MED_CERT_DOCUMENT_SCOPE`.
   - Then the careful line: "Fair Work says evidence should satisfy a reasonable person. Employer and institution policies may vary."
   - Right: `VerifyDemo`, with scene 4 behind it.
   - Below: a "See the full certificate" link opening `SpecimenViewer`.
   - Links: "Verify a certificate", "For employers".
   - The three resource links move into "More detail".
   - **The employer logo marquee is removed.** Update `marketing-copy-contract`, which pins it, and record the WCAG 2.2.2, trademark and template-tell reasons in the test comment.
4. **How it works** (`StepStory`, dawn band)
   - Intro: `MED_CERT_WEDGE`, verbatim.
   - "Tell us what's going on" (about 3 minutes).
   - "A clinical check" (`clinical_review_sequence_short`).
   - "Your certificate, by secure link": "If approved, we email you a secure link to your PDF certificate."
   - Ends with `OutcomePaths`.
   - Beside step 1: `WhatYouNeed` (certificate variant).
5. **Who checks your request** (white band): `ClinicalModelPanel`, with the LegitScript and Google logos.
6. **Pricing** ("Pick your days"): `DurationPicker`.
   - 1 day $24.95, 2 days $29.95, 3 days $39.95, all from `PRICING_DISPLAY`.
   - Beneath: "Covers the clinical check, your secure PDF and verification. No subscription." Then the refund line, with `refund_payment_process` in "More detail".
7. **FAQ** (`FaqSplit`, the existing five questions), with the `ContactLine`.
8. **Final CTA band** (dawn): "Back to bed. We'll take it from here." / "Start with a secure form. Takes about 3 minutes." / CTA with price / refund line. The heading goes through compliance review; the fallback is the current "Back to bed without a waiting room."
9. **Common reasons**: `MedCertReasonLinks` as a visible compact link list, not a hidden disclosure.

### 7.3 Prescriptions (sky world), 440 words or fewer

1. **Hero**
   - `LiveStatus`, without a median.
   - H1: "Your regular medication. A simpler repeat."
   - Subheading: `form_first_call_if_needed` ("A doctor reviews your form and only calls if something needs checking.").
   - `MoatBadgePair`: "No appointment" + "No video call" (md). Never an unqualified "No call needed" on this page.
   - Chips: "One regular medicine", "Medicare or IHI needed". "Australia only" and "Ages 18+" move into the fit check.
   - CTA: "Get your repeat · $29.95".
   - Refund line, then the proof row.
   - Visual: `OutcomeStage variant="escript"`.
2. **"Check it fits"** (`FitCheck`)
   - A repeat may fit when: Previously prescribed, Stable dose, One regular medicine, Health details up to date.
   - See your GP instead when: A new medicine, Controlled or dependence-forming medicines, Needs tests or an exam, Urgent symptoms (call 000 in an emergency).
   - Note: `prescribing_identity_required`, verbatim.
3. **"From form to pharmacy"** (`StepStory`, sky band)
   - Intro: "No appointment, no video call. Here's the whole path."
   - Steps:
     - "Tell us your medicine" (scene 1)
     - "Doctor review": `form_first_call_if_needed` (scene 2)
     - "eScript by text": `prescription_if_approved` (scene 5)
     - "Any Australian pharmacy": "Show the token at the pharmacy. You pay for the medicine there." (scene 6)
   - Ends with `OutcomePaths`.
   - Beside step 1: `WhatYouNeed` (prescription variant).
4. **Who checks your request** (white band): `ClinicalModelPanel`, with the LegitScript and Google logos. Prescriptions lead with row 3.
5. **"One review fee. Medicine paid separately."** (`FeeCard`)
   - $29.95 doctor review, once per request, no subscription.
   - Medicine cost paid at the pharmacy (PBS or private price).
   - Full refund if the doctor declines.
6. **FAQ** (`FaqSplit`: four questions with "Show all 9"; the "View all questions" link is removed), with the `ContactLine`.
7. **Final CTA band** (sky): "Ready for your repeat?" / `ICONIC_HOOK` / CTA with price / refund line.
8. **Learn more links** (kept, restyled).

## 8. Accessibility, performance and SEO requirements

- **Accessibility:**
  - WCAG 2.2 AA throughout.
  - Axe shows no serious or critical findings in light or dark.
  - Keyboard access to all menus, pickers and disclosures, with visible focus.
  - Icons and illustrations are `aria-hidden` unless meaningful.
  - The status story and notice are announced once through the figure caption, not live-updated.
  - 48 px touch targets on mobile.
- **Performance:**
  - LCP 800 ms or lower in the lab (Section 1) and CLS 0.
  - Illustrations are inline SVG components under 6 KB each, gzipped. The specimen image loads only when the viewer opens.
  - Added client JavaScript is 15 KB or less gzipped per page.
  - No new dependencies. The stack pin policy applies; the research shows Motion 12 supports React 18, but upgrading is out of scope.
- **SEO:**
  - H1 text unchanged on all three pages.
  - FAQ content and reason links remain in the HTML.
  - "More detail" content stays in the DOM.
  - Metadata unchanged.

## 9. Fix list (ship-ready items)

These items can ship before the redesign with Rey's OK, because they correct errors rather than change the design:

1. `limitations-section.tsx:25`: "Extended absences beyond 3–5 days" becomes "More than 3 days off".
2. `faq-section.tsx:111-122`: render only one "show all" control when `viewAllHref` is also present.
3. `services-dropdown.tsx:76`: solid white panel with a sky border (the full redesign follows in Section 6.5).
4. `med-cert-landing.tsx:231`: use the shared `Button` (`rounded-lg`).
5. Add explicit width and height to the two lazy images flagged in the console.

## 10. Verification

- **Contract updates** (keep every compliance assertion; change only structural pins):
  - `landing-hero-contract`
  - `money-page-lcp-critical-path`
  - `marketing-copy-contract`: marquee, `LiveStatus` wording, `PortfolioRouteMap` presence
  - `portfolio-art-direction-contract`
  - `money-page-narrative-contract` and `money-page-narrative-compression-contract`: section order and subheading
  - `code-clean-retirement-contract`: mockup imports
  - `advertising-compliance-guard`: new scene files join the visible-certificate wording surfaces and the fake-avatar scan
  - `canonical-trust-copy-contract`: short claim
  - `landing-vocabulary-contract` and `landing-type-floor-contract`: new files join `LANDING_SURFACES`
- **New tests:**
  - `LiveStatus` state table (unit)
  - Illustration contract: no people, medicine names or `blur`; `aria-hidden`; dark-mode variables
  - Motion contract: no infinite animation except the bounded glow; reduced-motion endpoints
  - `DurationPicker` deep links
  - e2e hero word budget
  - e2e 320 px overflow
  - Updated `e2e/landing-pages.spec.ts` page-length budgets, ratcheted down to the new measurements
- **Screenshot regression gate:**
  - Playwright `toHaveScreenshot` baselines for `/`, `/medical-certificate` and `/prescriptions` (full page), plus the open Services menu and the mobile menu, at 390x844 and 1440x900 in light mode.
  - Settings: animations disabled, and `LiveStatus` text, dates and the ProductReview widget masked. Threshold `maxDiffPixelRatio` 0.01.
  - Baselines are generated on the CI Linux image through a manual `workflow_dispatch` job and committed under `e2e/__screenshots__/`.
  - The gate is report-only for the first two weeks after release, then required. Updating a baseline needs an explicit commit whose message says so.
- **Additional tests:**
  - `MoatBadge`:
    - the claim allowlist
    - registry-only labels
    - the qualifier popover opens with keyboard and touch, and closes with Escape
    - reduced motion stops the check draw
    - `TrustBadge` delegation for `no_call` and `no_appointment`
  - `SpecimenViewer`: dialog focus and Escape, alt text, and a watermark assertion on the generated asset's metadata.
  - `VerifyDemo`: never fetches.
  - `ClinicalModelPanel`: the new registry claims.
  - FAQ anchors: a hash opens the right item.
  - Condensing header: toggles at the hero boundary and honours reduced motion.
  - `themeColor` per route.
  - Each OG image renders.
- **Browser proof:**
  - 1440x900 and 390x844, light and dark, reduced motion, for each page.
  - The How it works sticky sequence sampled at entry, each step and exit.
  - Menus opened with the keyboard.
  - Contact sheets delivered to Rey.
- **Reviews:**
  - `instantmed-marketing-compliance-review` on every new or changed string, including `LiveStatus` and the new "No call needed" label and qualifier. The research flagged the Medical Board's telehealth guidance on care without a real-time consultation, so the review confirms the badge framing sits within the approved certificate protocol, as the existing certificate wedge does.
  - `instantmed-clinical-safety-review` on the "Is this right for you?" and "Check it fits" lists.
  - A final whole-branch code review.

## 11. Rollout

1. **Fix list PR** (Section 9), on Rey's OK.
2. **Direction proof:**
   - Colour tokens, the type weight, the four gate illustrations, `OutcomeStage variant="certificate"` and `LiveStatus` on `/medical-certificate`, in a draft PR.
   - Screenshots go to Rey. **Stop until approved.**
3. **Full build:**
   - The remaining illustrations and the shared primitives.
   - The three pages and the chrome.
   - All verification.
4. **Release after 7 October** as one PR:
   - Annotate the release date in Google Ads and PostHog.
   - Compare 14 days before and after using the Section 1 measures.
   - Revert per page if a route breaches its threshold.

## 12. Out of scope, and what follows

- **Other pages:** the ED, hair loss, women's health and weight pages, the SEO guide pages and `/request` get a follow-up plan that reuses this system.
- **H1 message-match tests** after launch.
- **Photography.**
- **Pricing changes.**
- **Positioning (flagged for the operator, not decided here):** several competitors now advertise "real consultation, never a questionnaire", in line with AHPRA's October 2025 telehealth guidance on questionnaire-based prescribing. This spec keeps the approved form-first wording and flags the positioning question for a separate clinical and compliance decision.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Illustrations fall short of the quality bar | Four-piece proof gate; Rey approves before the rest are drawn; strict style rules in Section 5.2 |
| `LiveStatus` misleads when data is stale | Server-side gating on availability plus recent completions; defaults to "Requests open 24/7"; unit tests; compliance review |
| Copy cuts reduce SEO or answer fewer objections | H1s and FAQ unchanged; "More detail" keeps content in the DOM; ranking and conversion watched for 14 days |
| Heavier display weight changes LCP glyph coverage | Subsets already carry the 200–800 variable range; `front-door` glyph e2e |
| Scope creep into other pages | Explicit follow-up plan; shared components carry the new marks automatically |
