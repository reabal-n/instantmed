/**
 * Rubric category definitions. Pulled into its own file so both
 * rubric.ts (prompt builder) and schema.ts (Zod schema) can import
 * them without circular dependency.
 *
 * To add a category:
 *   1. Add an entry below.
 *   2. schema.ts auto-extends the categories object.
 *   3. rubric.ts auto-includes the category prompt.
 *   4. Re-run any sample critique to confirm Gemini honors the new key.
 */

export const RUBRIC_CATEGORIES = [
  {
    key: "brand_spine",
    label: "Brand spine",
    prompt:
      "Does the brand thesis 'Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee.' come through in the first 5 seconds? Is the tagline 'Faster than your GP.' visible and credibly delivered? Does the surface feel like Mosh's warmth crossed with Pilot's CTA confidence, or does it feel generic-healthtech?",
  },
  {
    key: "typography",
    label: "Typography",
    prompt:
      "Hero uses Plus Jakarta Sans (font-display, 48px+); body uses Source Sans 3. Is the hierarchy clear? Are line-height and letter-spacing comfortable on mobile? Any orphaned headings, awkward line breaks, dense paragraphs? Compare against Linear and Stripe for restraint.",
  },
  {
    key: "color_and_surface",
    label: "Color & surface",
    prompt:
      "Background is warm ivory #F8F7F4, never pure white. Cards are solid white on ivory with sky-toned shadows. Primary CTA is #2563EB blue. Brand coral #FF6B5B used only on brand-recognition moments. Does the page hold this restraint or has color crept in? Are surfaces calming on a high-anxiety patient flow, or visually loud?",
  },
  {
    key: "motion",
    label: "Motion",
    prompt:
      "Signature motion: ivory-to-dawn gradient sweep on page enter + 300ms ease-out lift on primary CTA hover. Respect useReducedMotion. Does motion feel intentional and physical (Linear-grade), or mechanical/linear (default spring 100/10)? Any jank, layout shift, or animations that interrupt scroll?",
  },
  {
    key: "copy_voice",
    label: "Copy & voice",
    prompt:
      "Voice = calm unhurried GP. Short sentences with full stops. Names the wait then removes it. No hype words, no 'our platform', no medical jargon, no em-dashes, no stacked adjectives, no banned phrases (cutting-edge, world-class, holistic, seamless, revolutionary, transformative, leverage, unlock, ai-powered etc). Australian English. Prices in the first breath. Flag any sentence that fails 'would a real GP say this out loud?'",
  },
  {
    key: "hierarchy_and_layout",
    label: "Hierarchy & layout",
    prompt:
      "Does the eye land on the primary CTA within 2 seconds? Is there a clear visual rhythm (Stripe-grade spacing)? Are sections distinguishable without heavy dividers? Mobile-first: does the 375px viewport feel composed, not crammed?",
  },
  {
    key: "conversion_friction",
    label: "Conversion friction",
    prompt:
      "Time-poor urban professional, 25-45, wants to start the form in <10 seconds. Count visible friction points: extra clicks before the form, missing price anchor, unclear next step, modal interruptions, premature identity gates, lack of trust signals at CTA proximity. The merchandised promise 'Full refund if our doctor can't help' should appear at conversion points.",
  },
  {
    key: "signature_devices",
    label: "Signature brand devices",
    prompt:
      "Five distinctive devices: live wait-counter ('Average med cert today: 14 minutes from form to inbox'), doctor's handwritten signature (mark only on marketing), 'what we won't do' page link, name-first emails, 'while you wait' specificity. Which devices are visible in this capture? Which are missing where they should be?",
  },
] as const

export type RubricCategoryKey = (typeof RUBRIC_CATEGORIES)[number]["key"]
