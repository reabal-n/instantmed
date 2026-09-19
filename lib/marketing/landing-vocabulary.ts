/**
 * Plain-language rules for the seven public landing pages (19 Sep 2026 audit).
 *
 * Scanned by lib/__tests__/landing-vocabulary-contract.test.ts and
 * lib/__tests__/landing-type-floor-contract.test.ts. Comments and the Next.js
 * `metadata` export are stripped before scanning, so only rendered copy is held
 * to these rules. Approved claims in lib/marketing/approved-claims.ts are the
 * source of truth for regulated sentences and are never edited here.
 */

/** Files whose rendered strings patients read on a landing page. */
export const LANDING_SURFACES = [
  "app/(marketing)/page.tsx",
  "components/marketing/portfolio-route-map.tsx",
  "components/marketing/med-cert-landing.tsx",
  "components/marketing/med-cert-client-controls.tsx",
  "components/marketing/prescriptions-landing.tsx",
  "components/marketing/prescriptions-client-controls.tsx",
  "components/marketing/erectile-dysfunction-landing.tsx",
  "components/marketing/hair-loss-landing.tsx",
  "components/marketing/womens-health-landing.tsx",
  "components/marketing/womens-health-decision-fork.tsx",
  "components/marketing/hero.tsx",
  "components/marketing/shared/sticky-cta.tsx",
  "lib/services/service-catalog.ts",
  "lib/data/med-cert-faq.ts",
  "lib/data/prescription-faq.ts",
  "lib/data/ed-faq.ts",
  "lib/data/hair-loss-faq.ts",
  "lib/data/womens-health-faq.ts",
  "components/marketing/home-client-controls.tsx",
  "lib/data/weight-loss-faq.ts",
] as const

/** Words a patient should never have to decode. */
export const LANDING_BLOCKED_TERMS = [
  { pattern: /\bpathways?\b/i, reason: 'say "form", "request", "assessment" or "service"' },
  { pattern: /\bform-first\b/i, reason: 'describe the mechanism instead: "a doctor reviews your form"' },
  { pattern: /\bfocused assessments?\b/i, reason: 'say "doctor assessments"' },
  { pattern: /\bchild page\b/i, reason: "CMS vocabulary; say the page name" },
  { pattern: /Start Consultation/, reason: 'retired vocabulary; use "Start assessment"' },
  { pattern: /\bdoctor-owned\b/i, reason: "governance vocabulary; say what the doctor does" },
  { pattern: /\b(?:Renew|Request|Start|Get)\b[^"'`\n]{0,40} - \$\d/, reason: 'the price separator is " · ", not " - "' },
] as const

/** Every repeat of a caveat lowers the confidence the page is trying to build. */
export const LANDING_CAVEAT_BUDGETS = [
  { label: "clinically appropriate", pattern: /clinically appropriate/gi, max: 1 },
  { label: "may call / contact / message", pattern: /\bmay (?:call|contact|message)\b/gi, max: 2 },
  { label: "not guaranteed", pattern: /\b(?:not|never) guaranteed\b/gi, max: 1 },
  { label: "Full refund", pattern: /Full refund/g, max: 3 },
] as const
