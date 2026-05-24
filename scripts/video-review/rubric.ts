/**
 * Rubric + reference bar fed to Gemini 2.5 Pro for the Critique stage.
 *
 * Reference bar = the four sites whose UI quality the rubric calibrates
 * against. Override here, not in the prompt, so you can A/B references
 * without touching pipeline code.
 */

export const REFERENCE_BAR = [
  {
    name: "Mosh",
    url: "https://mosh.com.au",
    why: "Direct AU comp. Warmth dial. How to feel human on a regulated-health surface.",
  },
  {
    name: "Pilot",
    url: "https://pilot.com.au",
    why: "Direct AU comp. CTA confidence. Calm conversion bar.",
  },
  {
    name: "Linear",
    url: "https://linear.app",
    why: "Motion + typographic restraint. Every transition has a reason. No decoration tax.",
  },
  {
    name: "Stripe",
    url: "https://stripe.com",
    why: "Form-flow polish on a regulated product. The gold standard for trust + speed in payments-adjacent UI.",
  },
] as const

/**
 * The categories Gemini scores. Each becomes a key in the response JSON.
 * Keep the count tight (8) so each category gets real attention rather
 * than 15 shallow paragraphs.
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

/**
 * JSON Schema passed to Gemini's responseSchema. Mirrors the Zod schema
 * used to validate the response. Hand-rolled (instead of zod-to-json-schema)
 * because the structure is small and explicit is easier to debug.
 *
 * Severity is 1-5 (1 = nit, 5 = revenue-blocker on the paid path).
 * Each finding carries a `timestamp_seconds` so Synthesize can cite the
 * video moment in the final report.
 */
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "2-3 sentence overall impression of the captured surface. Lead with the strongest signal, positive or negative.",
    },
    overall_score: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description: "1-10. 10 = matches reference bar (Linear/Stripe-grade). 5 = generic healthtech.",
    },
    categories: {
      type: "object",
      properties: Object.fromEntries(
        RUBRIC_CATEGORIES.map((c) => [
          c.key,
          {
            type: "object",
            properties: {
              score: { type: "integer", minimum: 1, maximum: 10 },
              observation: {
                type: "string",
                description: "What you saw. Concrete. Avoid platitudes.",
              },
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    severity: { type: "integer", minimum: 1, maximum: 5 },
                    timestamp_seconds: { type: "number" },
                    issue: { type: "string", description: "1 sentence, specific." },
                    recommendation: {
                      type: "string",
                      description: "Concrete fix. File path or component name if inferrable.",
                    },
                  },
                  required: ["severity", "timestamp_seconds", "issue", "recommendation"],
                },
              },
            },
            required: ["score", "observation", "findings"],
          },
        ]),
      ),
      required: RUBRIC_CATEGORIES.map((c) => c.key),
    },
    top_three_actions: {
      type: "array",
      description:
        "The three highest-impact changes the team should ship next. Ordered most to least valuable. Each must be actionable in <1 day.",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          why: { type: "string", description: "Tied to a specific observation above." },
          estimated_impact: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
        },
        required: ["action", "why", "estimated_impact"],
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["summary", "overall_score", "categories", "top_three_actions"],
} as const

/**
 * Compose the rubric prompt fed to Gemini alongside the video.
 */
export function buildRubricPrompt(): string {
  const refBar = REFERENCE_BAR.map(
    (r) => `- ${r.name} (${r.url}) — ${r.why}`,
  ).join("\n")

  const categories = RUBRIC_CATEGORIES.map(
    (c) => `### ${c.label} (key: ${c.key})\n${c.prompt}`,
  ).join("\n\n")

  return `You are reviewing a screencast of a healthtech web product (InstantMed, an Australian telehealth platform). Your job is a candid, calibrated design + UX critique.

# Reference bar
The bar is set by these four sites. The product should feel like it belongs in their company:

${refBar}

A 10 means the product holds its own against these references. A 5 means it looks like generic healthtech. A 3 means it actively hurts trust on a regulated-health surface.

# Rubric
Score and observe each of the following categories. Be specific. Cite timestamps from the video.

${categories}

# Output rules
- Return JSON only. No prose outside the JSON.
- Every finding must carry a timestamp in seconds.
- Severity 1-5 (5 = revenue blocker on the paid path).
- Top three actions must be shippable in less than a day each.
- If a category has no findings, return an empty findings array. Do not invent issues.
- Do not be polite. The team wants real signal.`
}
