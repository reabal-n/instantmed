/**
 * Advertising compliance guard.
 *
 * Scans public acquisition surfaces for claims that are not allowed under the
 * current source-of-truth docs:
 *   - docs/ADVERTISING_COMPLIANCE.md
 *   - docs/SEO_CONTENT_POLICY.md
 *   - docs/BUSINESS_PLAN.md
 *
 * It catches the highest-risk phrases that previously drifted into public
 * pages, including programmatic SEO surfaces.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { BADGE_PRESETS } from "@/lib/marketing/trust-badges"
import { getActiveServices, getComingSoonServices, SERVICE_CATALOG } from "@/lib/services/service-catalog"

const ROOT = path.resolve(__dirname, "../..")

const EXTENSIONS = new Set([".ts", ".tsx"])

const NON_MEDCERT_FORM_FIRST_SURFACES = [
  "app/erectile-dysfunction",
  "app/hair-loss",
  "app/about/page.tsx",
  "app/about/about-client.tsx",
  "app/how-it-works/page.tsx",
  "app/mental-health-online",
  "app/online-doctor-australia/page.tsx",
  "app/weight-loss",
  "app/womens-health",
  "app/uti-assessment-online",
  "app/contraceptive-pill-assessment-online",
  "app/prescriptions",
  "components/marketing/erectile-dysfunction-landing.tsx",
  "components/marketing/hair-loss-landing.tsx",
  "components/marketing/womens-health-landing.tsx",
  "components/shared/navbar/services-dropdown.tsx",
  "components/marketing/sections/how-it-works-inline.tsx",
  "components/marketing/how-it-works.tsx",
  "components/marketing/mental-health-online-landing.tsx",
  "lib/data/ed-faq.ts",
  "lib/data/hair-loss-faq.ts",
  "lib/data/mental-health-online-faq.ts",
  "lib/data/womens-health-faq.ts",
  "lib/email/components/templates/abandoned-checkout-followup.tsx",
  "lib/marketing/homepage.ts",
  "components/request/service-hub-screen.tsx",
  "content/blog",
]

const MED_CERT_ACCEPTANCE_SURFACES = [
  "app/compare",
  "app/employers",
  "app/for",
  "app/intent",
  "app/locations",
  "app/medical-certificate",
  "components/marketing",
  "components/seo",
  "lib/data",
  "lib/marketing/med-cert-intent-config.ts",
  "lib/marketing/med-cert-selector.ts",
  "lib/marketing/services.ts",
  "lib/marketing/trust-badges.ts",
  "lib/seo",
]

const MED_CERT_VISIBLE_CERTIFICATE_MOCKUP_SURFACES = [
  "components/marketing/mockups/med-cert-hero-mockup.tsx",
  "components/marketing/sample-certificate.tsx",
]

const MED_CERT_DRAFT_LANGUAGE_SURFACES = [
  "app/actions/drafts/generate-med-cert.ts",
  "lib/ai/prompts/index.ts",
  "components/admin/certificate-preview.tsx",
]

const PUBLIC_FAKE_PROOF_AVATAR_SURFACES = [
  "app/sign-in",
  "app/sign-up",
  "components/marketing/med-cert-intent-page.tsx",
  "components/marketing/hero-doctor-review-mockup.tsx",
  "components/marketing/how-it-works.tsx",
]

const URL_PRIVACY_SURFACES = [
  "app",
  "components",
  "lib",
  "content/blog",
]

const PAID_PRESCRIPTION_DESTINATION_SURFACES = [
  "app/erectile-dysfunction/page.tsx",
  "app/hair-loss/page.tsx",
  "app/weight-loss/page.tsx",
  "app/weight-loss/weight-loss-client.tsx",
  "app/prescriptions/page.tsx",
  "app/womens-health/page.tsx",
  "app/uti-assessment-online/page.tsx",
  "app/contraceptive-pill-assessment-online/page.tsx",
  "components/marketing/erectile-dysfunction-landing.tsx",
  "components/marketing/hair-loss-landing.tsx",
  "components/marketing/womens-health-landing.tsx",
  "components/marketing/prescriptions-landing.tsx",
  "components/marketing/mockups/escript-hero-mockup.tsx",
  "components/marketing/sections/escript-explainer-section.tsx",
  "components/marketing/sections/prescription-limitations-section.tsx",
  "components/marketing/sections/supported-medications-section.tsx",
  "components/shared/navbar/services-dropdown.tsx",
  "lib/data/ed-faq.ts",
  "lib/data/hair-loss-faq.ts",
  "lib/data/womens-health-faq.ts",
  "lib/data/prescription-faq.ts",
  "lib/marketing/homepage.ts",
]

const PUBLIC_CREDENTIAL_CLAIM_SURFACES = [
  "app/about",
  "app/clinical-governance",
  "app/employers/page.tsx",
  "app/our-doctors",
  "app/online-doctor-australia",
  "app/telehealth-australia",
  "app/for/employers/page.tsx",
  "app/for/universities/page.tsx",
  "components/marketing/sections",
  "components/shared/regulator-logo-marquee.tsx",
  "components/seo/schemas/organization.tsx",
  "lib/marketing/trust-badges.ts",
]

const PUBLIC_SOCIAL_PROOF_SURFACES = [
  "app/about",
  "app/contact",
  "app/conditions",
  "app/erectile-dysfunction",
  "app/for",
  "app/hair-loss",
  "app/how-it-works",
  "app/locations",
  "app/medical-certificate",
  "app/online-doctor-australia",
  "app/prescriptions",
  "app/pricing",
  "app/request",
  "app/sign-in",
  "app/sign-up",
  "app/telehealth-australia",
  "app/trust",
  "app/weight-loss",
  "components/marketing",
  "components/request/help-tooltip.tsx",
  "components/request/service-hub-screen.tsx",
  "components/seo",
  "components/shared/navbar",
  "lib/marketing",
  "lib/seo",
  "lib/services/service-catalog.ts",
  "lib/social-proof",
]

const PUBLIC_OUTCOME_STAT_SURFACES = PUBLIC_SOCIAL_PROOF_SURFACES.filter(
  (surface) => surface !== "lib/social-proof",
)

const PUBLIC_DOCTOR_MODEL_SURFACES = [
  "app/sign-in",
  "app/sign-up",
  "app/layout.tsx",
  "app/manifest.ts",
  "app/online-doctor-australia",
  "app/blog/page.tsx",
  "app/our-doctors",
  "app/trust",
  "components/marketing/credential-card.tsx",
  "components/marketing/how-it-works.tsx",
  "components/marketing/med-cert-landing.tsx",
  "lib/constants/index.ts",
  "lib/marketing/homepage.ts",
  "lib/marketing/services.ts",
  "lib/microcopy",
]

const PUBLIC_FIXED_TURNAROUND_SURFACES = [
  "app",
  "components/marketing",
  "components/patient/what-happens-next.tsx",
  "components/request/steps/certificate-step.tsx",
  "components/request/steps/weight-loss-call-step.tsx",
  "components/seo",
  "components/shared/footer.tsx",
  "lib/data",
  "lib/email/components/templates",
  "lib/marketing",
  "lib/microcopy",
  "lib/seo/data/competitor-comparisons.ts",
  "lib/seo/data/audience-pages.ts",
  "lib/seo/data/deep-city-content",
  "lib/seo/data/guides",
  "lib/seo/data/states.ts",
  "lib/seo/pages",
  "lib/seo/symptoms.ts",
]

const PUBLIC_TRUST_LOGO_SURFACES = [
  "app/about",
  "app/consult",
  "app/hair-loss",
  "app/prescriptions",
  "components/marketing",
  "components/shared/employer-logo-marquee.tsx",
  "components/shared/trust-badge.tsx",
  "lib/marketing/trust-badges.ts",
]

const NO_CALL_PATTERNS = [
  /\bno call\b/i,
  /\bno call needed\b/i,
  /\bno call required\b/i,
  /\bno phone call\b/i,
  /\bno conversation needed\b/i,
  /\bno need to speak\b/i,
  /\bno calls?, no\b/i,
  /\bwe only interrupt\b/i,
  /\bwe only contact you if\b/i,
  /\bdoctor contacts you only if\b/i,
  /\bfollows up only if\b/i,
  /\breach(?:es)? out only if\b/i,
]

const MED_CERT_ACCEPTANCE_PATTERNS = [
  /\baccepted by all\b/i,
  /\baccepted by [^"'\n]*(?:employers?|universit(?:y|ies)|schools?|government|councils?|hospitals?|health services?|agencies)\b/i,
  /\baccepted for\b/i,
  /\b(?:all|any) employers? accept/i,
  /\bemployer-accepted\b/i,
  /\bemployer accepted\b/i,
  /\bUni\s*&\s*TAFE accepted\b/i,
  /\bcommonly accepted\b/i,
  /\bmust accept\b/i,
  /\bvalid for all (?:Australian )?(?:employers|workplaces)\b/i,
  /\bHR-approved\b/i,
  /\b98%\s+accepted\b/i,
  /\bspecial consideration\b/i,
  /\bdeferred exams?\b/i,
  /\bexam deferrals?\b/i,
  /\bassignment extensions?\b/i,
  /\bjury duty\b/i,
  /\btribunal\b/i,
  /\bworkers comp\b/i,
]

const MEDICATION_QUERY_PATTERNS = [
  /[?&]medication=/i,
  /[?&]drug=/i,
]

const LOCKED_CERTIFICATE_LANGUAGE_PATTERNS = [
  /\bunfit for\b/i,
  /\bfit for\b/i,
  /\bfitness for\b/i,
  /\btelehealth consultation\b/i,
  /\basynchronous telehealth\b/i,
  /\bwork\/study\b/i,
]

const PUBLIC_PRESCRIPTION_DRUG_TERM_PATTERNS = [
  /\b(sildenafil|tadalafil|viagra|cialis|finasteride|dutasteride|minoxidil|ozempic|wegovy|mounjaro|duromine|phentermine|semaglutide|tirzepatide|atorvastatin|amlodipine|ramipril|perindopril|rosuvastatin|ventolin|seretide|symbicort|valium|xanax)\b/i,
  /\bED medication\b/i,
  /\bweight loss injections?\b/i,
  /\bTGA-approved (?:treatments?|medications?)\b/i,
  /\bclinically proven (?:approach|treatment|medication)\b/i,
  /\bdoctor-prescribed treatment\b/i,
  /\bantibiotics?\b/i,
]

const PUBLIC_REVIEW_ADVERTISING_PATTERNS = [
  /\baggregateRating\b/,
  /\bReviewAggregateSchema\b/,
  /\breviewCount\b/,
  /\bratingCount\b/,
  /\bratingValue\b/,
  /\bratingWithStar\b/,
  /\bGOOGLE_REVIEWS\.count\b/,
  /\bSOCIAL_PROOF_DISPLAY\.rating\b/,
  /\bsatisfaction:\s*["'][0-9.]+\/5["']/,
  /\b[0-9]\.[0-9]\s*\/\s*5\b/,
  /\b[0-9]\.[0-9]\s*★/,
  /\b[0-9]\.[0-9]\s*stars?\b/i,
  /\b[0-9][0-9,]*\+?\s+reviews?\b/i,
]

const PUBLIC_FAKE_PROOF_AVATAR_PATTERNS = [
  /api\.dicebear\.com/i,
  /\bnotionists\b/i,
  /\bSophiaChen\b/,
  /\bMarcusWilliams\b/,
  /\bAishaPatel\b/,
  /\bTomBrennan\b/,
  /\bDoctor[0-9]\b/,
]

const PUBLIC_RISKY_TRUST_LOGO_PATTERNS = [
  /\bTGA compliant\b/i,
  /\bPharmacy Certified\b/i,
  /\bUsed by employees at\b/i,
  /\bemployer endorsement\b/i,
  /\bemployer acceptance\b/i,
  /\bGoogle certified\b/i,
]

const PUBLIC_RISKY_OUTCOME_STAT_PATTERNS = [
  /SOCIAL_PROOF\.(certApprovalPercent|scriptFulfillmentPercent|sameDayDeliveryPercent|patientReturnPercent|employerAcceptancePercent|doctorCount)\b/,
  /\bapproval rate\b/i,
  /\bfulfilled same day\b/i,
  /\bdelivered same day\b/i,
  /\bpatients return\b/i,
]

const PUBLIC_DOCTOR_MODEL_OVERCLAIM_PATTERNS = [
  /\bAHPRA GP\b/i,
  /\bAHPRA(?:-registered| registered)? GP\b/i,
  /\bAHPRA-registered (?:Australian )?GPs?\b/i,
  /\bAHPRA-registered online GPs?\b/i,
  /\b(?:real|qualified) GPs?\b/i,
  /\bonline GPs?\b/i,
]

const PUBLIC_FIXED_TURNAROUND_PATTERNS = [
  /\bunder 15 minutes\b/i,
  /\bwithin the hour\b/i,
  /\bwithin an hour\b/i,
  /\bwithin 1[-–]2 hours\b/i,
  /\bwithin 1 hour\b/i,
  /\bwithin hours\b/i,
  /\bwithin 30[-–]60 minutes\b/i,
  /\bwithin 30 minutes\b/i,
  /\bin under 30 minutes\b/i,
  /\btypically in under 30 minutes\b/i,
  /\bin about 20 minutes\b/i,
  /\baround 20 minutes\b/i,
  /\busually within 20 minutes\b/i,
  /\busually under 30 minutes\b/i,
  /\busually within a few hours\b/i,
  /\bUsually under 1 hour\b/i,
  /\bUsually within 1[-–]2h\b/i,
  /\btypically reviewed within\b/i,
  /\bAverage review time\b/i,
  /\b15-minute priority\b/i,
  /\b~20 min\b/i,
  /\bMost requests reviewed\b/i,
  /\bMost certificates are reviewed\b/i,
  /\bMost reviewed\b/i,
  /\bcompleted within an hour\b/i,
  /\bCertificate issued immediately\b/i,
  /\bCertificate issued and emailed in about 20 minutes\b/i,
  /\breviewed in minutes\b/i,
  /\bReviewed by AHPRA-registered doctors in minutes\b/i,
  /\bsame-day access\b/i,
  /\bsame-day service\b/i,
  /\bsent same day\b/i,
  /\barrives the same day\b/i,
  /\bsame-day turnaround\b/i,
  /\breviewed same-day\b/i,
  /\bsame-day review\b/i,
  /\bdelivered same-day\b/i,
  /\bMost people are sorted\b/i,
]

const RETIRED_PUBLIC_LINK_TARGETS = [
  "/blog/understanding-escripts-australia",
  "/blog/pbs-subsidies-guide",
  "/blog/how-to-get-medical-certificate-online-australia",
  "/blog/telehealth-vs-gp-when-to-use-each",
]

function toFullPath(relative: string): string {
  return path.join(ROOT, relative)
}

function walk(target: string, acc: string[] = []): string[] {
  const full = toFullPath(target)
  let st
  try {
    st = statSync(full)
  } catch {
    return acc
  }

  if (st.isFile()) {
    if (EXTENSIONS.has(path.extname(full))) acc.push(full)
    return acc
  }

  for (const entry of readdirSync(full)) {
    if (entry.startsWith(".") || entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) continue
    walk(path.join(target, entry), acc)
  }

  return acc
}

function collectFiles(targets: string[]): string[] {
  return targets.flatMap((target) => walk(target))
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
}

function findHits(files: string[], patterns: RegExp[]) {
  const hits: Array<{ file: string; line: number; pattern: string; snippet: string }> = []

  for (const file of files) {
    const raw = readFileSync(file, "utf8")
    const scrubbed = stripComments(raw)
    const lines = scrubbed.split("\n")

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of patterns) {
        if (pattern.test(lines[i])) {
          hits.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            pattern: pattern.source,
            snippet: lines[i].trim().slice(0, 140),
          })
        }
      }
    }
  }

  return hits
}

function failWithReport(title: string, hits: ReturnType<typeof findHits>): void {
  const report = hits
    .map((hit) => `  ${hit.file}:${hit.line}  [${hit.pattern}]  ${hit.snippet}`)
    .join("\n")
  throw new Error(`${title}: ${hits.length} hit(s).\n${report}`)
}

function presetIds(preset: string): string[] {
  return (BADGE_PRESETS[preset] ?? []).map((entry) => {
    if (typeof entry === "string") return entry
    return entry.id
  })
}

describe("advertising compliance guard", () => {
  it("keeps prescription and specialty surfaces form-first instead of no-call absolute", () => {
    const hits = findHits(collectFiles(NON_MEDCERT_FORM_FIRST_SURFACES), NO_CALL_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Form-first guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps med-cert surfaces clear of unsupported acceptance and high-stakes use-case claims", () => {
    const hits = findHits(collectFiles(MED_CERT_ACCEPTANCE_SURFACES), MED_CERT_ACCEPTANCE_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Med-cert acceptance guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps visible certificate mockups aligned with locked PDF wording", () => {
    const hits = findHits(
      collectFiles(MED_CERT_VISIBLE_CERTIFICATE_MOCKUP_SURFACES),
      LOCKED_CERTIFICATE_LANGUAGE_PATTERNS,
    )
    if (hits.length > 0) {
      failWithReport("Visible certificate mockup language guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps med-cert draft prompts aligned with locked PDF wording", () => {
    const hits = findHits(collectFiles(MED_CERT_DRAFT_LANGUAGE_SURFACES), LOCKED_CERTIFICATE_LANGUAGE_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Med-cert draft language guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("does not pass medicine names into URLs", () => {
    const hits = findHits(collectFiles(URL_PRIVACY_SURFACES), MEDICATION_QUERY_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Prescription education URL guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps paid prescription destinations service-level instead of drug-led", () => {
    const hits = findHits(
      collectFiles(PAID_PRESCRIPTION_DESTINATION_SURFACES),
      PUBLIC_PRESCRIPTION_DRUG_TERM_PATTERNS,
    )
    if (hits.length > 0) {
      failWithReport("Prescription drug-term guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps drug-detail pages retired and the request URL service-only", () => {
    expect(existsSync(toFullPath("app/prescriptions/med/[slug]/page.tsx"))).toBe(false)
    expect(existsSync(toFullPath("app/hair-loss/hair-loss-client.tsx"))).toBe(false)

    const requestPageSource = readFileSync(toFullPath("app/request/page.tsx"), "utf8")
    const requestFlowSource = readFileSync(toFullPath("components/request/request-flow.tsx"), "utf8")

    expect(requestPageSource).not.toContain("medication?: string")
    expect(requestPageSource).not.toContain("params.medication")
    expect(requestFlowSource).not.toContain("initialMedication")
  })

  it("keeps no-call badges out of non-medcert presets", () => {
    const nonMedcertPresets = ["hero_rx", "hero_consult", "hero_generic", "pre_cta", "float"]

    for (const preset of nonMedcertPresets) {
      expect(presetIds(preset), `${preset} must not use no-call badge ids`).not.toContain("no_call")
      expect(presetIds(preset), `${preset} must not use no-speaking badge ids`).not.toContain("no_speaking")
    }
  })

  it("keeps trust logos framed as verification rather than endorsement or approval", () => {
    const hits = findHits(
      collectFiles(PUBLIC_TRUST_LOGO_SURFACES),
      PUBLIC_RISKY_TRUST_LOGO_PATTERNS,
    )
    if (hits.length > 0) {
      failWithReport("Public trust-logo claim guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps RACGP and FRACGP off public badge primitives", () => {
    const source = readFileSync(toFullPath("lib/marketing/trust-badges.ts"), "utf8")

    expect(source).not.toMatch(/\bRACGP\b/)
    expect(source).not.toMatch(/\bFRACGP\b/)
  })

  it("keeps RACGP, FRACGP, and peer-review claims out of public credential marketing", () => {
    const patterns = [/\bRACGP\b/i, /\bFRACGP\b/i, /\bpeer[- ]review\b/i]
    const hits = findHits(collectFiles(PUBLIC_CREDENTIAL_CLAIM_SURFACES), patterns)
    if (hits.length > 0) {
      failWithReport("Public credential claim guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps public doctor model claims to registered doctors, not unverified GP labels", () => {
    const hits = findHits(
      collectFiles(PUBLIC_DOCTOR_MODEL_SURFACES),
      PUBLIC_DOCTOR_MODEL_OVERCLAIM_PATTERNS,
    )
    if (hits.length > 0) {
      failWithReport("Public doctor-model claim guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps public surfaces away from fixed review-time promises", () => {
    const hits = findHits(
      collectFiles(PUBLIC_FIXED_TURNAROUND_SURFACES),
      PUBLIC_FIXED_TURNAROUND_PATTERNS,
    )
    if (hits.length > 0) {
      failWithReport("Public fixed-turnaround guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps public social proof stars-only without aggregate ratings, review counts, or testimonials", () => {
    const hits = findHits(collectFiles(PUBLIC_SOCIAL_PROOF_SURFACES), PUBLIC_REVIEW_ADVERTISING_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Public review advertising guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps public social proof away from unsupported outcome-rate claims", () => {
    const hits = findHits(
      collectFiles(PUBLIC_OUTCOME_STAT_SURFACES),
      PUBLIC_RISKY_OUTCOME_STAT_PATTERNS,
    )
    if (hits.length > 0) {
      failWithReport("Public outcome-rate proof guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps public auth and marketing proof free of fake people avatars", () => {
    const hits = findHits(collectFiles(PUBLIC_FAKE_PROOF_AVATAR_SURFACES), PUBLIC_FAKE_PROOF_AVATAR_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Public fake-proof avatar guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps public acquisition links pointed at canonical article slugs", () => {
    const source = collectFiles([
      "app",
      "components/marketing",
      "components/shared",
      "components/seo",
      "lib/marketing",
      "lib/seo",
    ]).map((file) => readFileSync(file, "utf8")).join("\n")

    for (const target of RETIRED_PUBLIC_LINK_TARGETS) {
      expect(source, `${target} should not be linked directly`).not.toContain(target)
    }
  })

  it("keeps weight management future-scaffolded but not publicly purchasable", () => {
    expect(existsSync(toFullPath("app/weight-loss/page.tsx"))).toBe(true)
    expect(existsSync(toFullPath("app/weight-loss/weight-loss-client.tsx"))).toBe(true)

    expect(SERVICE_CATALOG["weight-loss"]).toMatchObject({
      comingSoon: true,
      price: "Planned",
      priceFrom: 0,
      slug: "weight-loss",
      subtype: "weight_loss",
    })
    expect(getComingSoonServices().map((service) => service.id)).toContain("weight-loss")
    expect(getActiveServices().map((service) => service.id)).not.toContain("weight-loss")

    const weightLossPageSource = readFileSync(toFullPath("app/weight-loss/page.tsx"), "utf8")
    expect(weightLossPageSource).toContain('redirect("/request")')
    expect(weightLossPageSource).toContain("index: false")

    const sitemapSource = readFileSync(toFullPath("app/sitemap.ts"), "utf8")
    const htmlSitemapSource = readFileSync(toFullPath("app/sitemap-html/page.tsx"), "utf8")
    expect(sitemapSource).not.toContain('"/weight-loss"')
    expect(htmlSitemapSource).not.toContain('href: "/weight-loss"')
    expect(sitemapSource).toContain('"/weight-loss-online"')
    expect(htmlSitemapSource).toContain('href: "/weight-loss-online"')
  })

  it("keeps internal review and testimonial pages/components retired", () => {
    expect(existsSync(toFullPath("app/reviews/page.tsx"))).toBe(false)
    expect(existsSync(toFullPath("app/reviews/reviewsClientPage.tsx"))).toBe(false)
    expect(existsSync(toFullPath("lib/data/testimonials.ts"))).toBe(false)
    expect(existsSync(toFullPath("components/marketing/hero-testimonial-rotator.tsx"))).toBe(false)
    expect(existsSync(toFullPath("components/marketing/recent-reviews-ticker.tsx"))).toBe(false)
    expect(existsSync(toFullPath("components/ui/testimonials-columns-wrapper.tsx"))).toBe(false)
  })
})
