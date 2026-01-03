# Programmatic SEO System - InstantMed

## Overview

This document describes the programmatic SEO system for generating high-quality, compliant landing pages that capture organic search traffic for medical certificates and repeat prescriptions.

**Key Metrics:**
- **Total Pages:** 50+ (growing)
- **Conditions:** 15 medical conditions
- **Certificates:** 3 certificate types
- **Benefits:** 1 "why online" page
- **Resources:** 2 FAQ/compliance pages

**URL Structure:**
```
/seo/conditions/[slug]    → Condition info pages (cold, flu, migraine, etc.)
/seo/certificates/[slug]  → Certificate type pages (work, study, carer)
/seo/why-[slug]           → Benefit pages
/seo/resources/[slug]     → FAQ & disclaimer pages
```

---

## File Structure

```
lib/seo/
├── pages.ts              # Typed data layer (all page content)
├── schema.ts             # JSON-LD structured data generators
└── ...

components/seo/
├── seo-page-template.tsx # Main page rendering template
└── related-pages.tsx     # Internal linking component

app/(seo)/
├── conditions/[slug]/page.tsx   # Dynamic condition pages
├── certificates/[slug]/page.tsx # Dynamic certificate pages
├── why-[slug]/page.tsx          # Dynamic benefit pages
└── resources/[slug]/page.tsx    # Dynamic resource pages

app/
├── sitemap.ts            # Auto-updated with all SEO pages
└── robots.ts             # Auto-updated with all SEO pages
```

---

## Content Guidelines

### Medical Compliance

✅ **Required:**
- Clear disclaimers: "This is not a diagnosis" + "See ED/call 000 for emergencies"
- Red flags listed: when to see a GP in person
- AHPRA-registered doctor authority claimed (accurate)
- No false cure claims: "may help", "can assess", not "will cure"
- Australian language + disclaimers

❌ **Never:**
- "Instant approval", "guaranteed", "overnight cure"
- Specific medical diagnoses or treatment protocols
- Claims about efficacy without evidence
- Advice beyond scope (e.g., specialized surgery recommendations)
- Targeting illegal/restricted content

### Content Quality

✅ **Each page has:**
1. Unique, human-readable content (not templated keyword swaps)
2. Clear H1 + structure (symptoms, when to see GP, how we help, FAQs)
3. 3–5 related pages internally linked
4. Minimum 2,000 characters of content
5. 5–10 FAQs per page
6. Proper meta titles/descriptions for CTR

❌ **Avoid:**
- Doorway pages (thin content, no unique value)
- Keyword stuffing (same word >10x in short content)
- Duplicate content across pages
- Auto-generated copy (ChatGPT without editing)
- Irrelevant pages (e.g., medical condition with no cert/RX relevance)

---

## Expanding the Page Inventory

### Quick Start

1. Open `/lib/seo/pages.ts`
2. Add a new object to `conditionPages` array
3. Fill in all required fields (see template below)
4. Run `npm run build` to generate static pages
5. Test at `/seo/conditions/[slug]`

### New Condition Page Template

```typescript
{
  slug: "condition-name",
  name: "Condition Name",
  title: "Condition Name | Medical Assessment | InstantMed",
  description: "Get condition treatment online. Brief summary (50+ chars).",
  h1: "Catchy H1 about condition",
  heroText: "Compelling hero message for the user.",
  symptoms: [
    "Symptom 1",
    "Symptom 2",
    "Symptom 3",
    "Symptom 4",
    "Symptom 5",
    // Minimum 5
  ],
  whenToSeeGP: [
    "Emergency symptom 1",
    "Emergency symptom 2",
    "Emergency symptom 3",
    // Minimum 3
  ],
  whenWeCanHelp: [
    "Scenario 1 we can handle",
    "Scenario 2 we can handle",
    "Scenario 3 we can handle",
  ],
  howWeHelp: [
    "Step 1 of process",
    "Step 2 of process",
    "Step 3 of process",
  ],
  disclaimers: [
    "Medical disclaimer 1",
    "Medical disclaimer 2",
  ],
  faqs: [
    { q: "Question?", a: "Answer." },
    { q: "Question?", a: "Answer." },
    { q: "Question?", a: "Answer." },
    // Minimum 3
  ],
  relatedConditions: [
    "cold-and-flu",
    "sore-throat",
  ],
}
```

### Validation Checklist

Before adding a new page:
- [ ] Slug: 3+ chars, lowercase, hyphens (no spaces)
- [ ] Title: 50+ chars, includes primary keyword
- [ ] Description: 50+ chars, unique from other pages
- [ ] Symptoms: 5+ items, medically accurate
- [ ] Red flags: 3+ items, emergency-focused
- [ ] FAQs: 3+ items, addresses user concerns
- [ ] No guarantee claims ("instant", "cure", "100%")
- [ ] Links to 2–3 related pages
- [ ] Content passes quality checks (no keyword stuffing)

---

## Google Indexing Checklist

### Before Launch

- [ ] Sitemap auto-updated (`app/sitemap.ts`)
- [ ] Robots allow all non-auth pages (`app/robots.ts`)
- [ ] Canonical URLs set per page
- [ ] Meta titles: 50–60 chars, primary keyword first
- [ ] Meta descriptions: 120–150 chars, include CTA
- [ ] H1 unique per page, includes primary keyword
- [ ] 5+ internal links per page
- [ ] JSON-LD FAQPage schema included
- [ ] Open Graph tags set (og:title, og:description, og:url)
- [ ] No noindex tags

### After Launch

1. **Submit Sitemap to Google Search Console**
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add property: `https://instantmed.com.au`
   - Submit sitemap: `https://instantmed.com.au/sitemap.xml`

2. **Monitor Indexing**
   - Check "Coverage" report monthly
   - Ensure all SEO pages are indexed
   - Fix any "Excluded" or "Error" pages

3. **Optimize for Rankings**
   - Monitor top pages in Google Search Console
   - Check average ranking position per page
   - Add internal links from high-authority pages to low-ranking ones
   - Update stale content

4. **Monitor Performance**
   - Track clicks from organic search
   - Track impressions (visibility)
   - Monitor CTR (aim for 3–5% avg)
   - Check bounce rate per page

---

## Page Templates & Examples

### Condition Page Structure

```
Hero Section
├── H1 ("Condition Name — Clear Benefit")
├── Hero text (2–3 sentences, user-focused)
└── CTA button ("Start online consult")

Content Section
├── Common Symptoms (5+ items)
├── When to See GP (red flags, 3+ items)
├── When We Can Help (3 scenarios)
├── How It Works (3–4 steps)
├── Disclaimers (2+ items)
└── CTA (Call-to-action repeater)

FAQ Section
├── 5–10 Q&A pairs
└── Collapsible accordion

Related Pages
├── 2–3 related conditions
└── Internal links to resources
```

### Certificate Page Structure

```
Hero Section
├── H1 ("Certificate Type — Use Case")
├── Hero text
└── CTA

Content Section
├── Use Cases (3–5 scenarios)
├── How to Use (3–4 steps)
├── Backdating Info (compliance)
├── Disclaimers (3+ items)
└── CTA

FAQ Section
├── 5–10 Q&A pairs
└── Accordion
```

---

## Data Model Reference

### ConditionPage

```typescript
interface ConditionPage {
  slug: string                 // URL slug
  name: string                 // Display name
  title: string                // Meta title (50–60 chars)
  description: string          // Meta description (120–150 chars)
  h1: string                   // Page H1
  heroText: string             // Hero section text
  symptoms: string[]           // 5+ items
  whenToSeeGP: string[]        // 3+ red flags
  whenWeCanHelp: string[]      // 3 scenarios
  howWeHelp: string[]          // 3–4 steps
  disclaimers: string[]        // 2+ items
  faqs: Array<{q, a}>          // 3+ items
  relatedConditions: string[]  // 2–3 slugs
}
```

### CertificatePage

```typescript
interface CertificatePage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  heroText: string
  useCases: string[]           // 3–5 items
  howToUse: string[]           // 3–4 steps
  backdatingInfo: string       // Compliance note
  disclaimers: string[]        // 3+ items
  faqs: Array<{q, a}>          // 5+ items
}
```

---

## Performance & Caching

- **Static Generation:** All SEO pages are pre-rendered at build time (fast, no DB calls)
- **ISR (Incremental Static Regeneration):** Optional for future updates
- **Edge Caching:** Sitemap cached; revalidate monthly
- **Bundle Impact:** <50KB additional JS (data layer only, page content in HTML)

---

## Monitoring & Maintenance

### Monthly

- [ ] Google Search Console: check coverage, indexing errors
- [ ] Check top 10 performing pages (impressions)
- [ ] Identify low-ranking pages (avg position >50)
- [ ] Update stale medical info

### Quarterly

- [ ] Audit internal linking: ensure all related pages linked
- [ ] Check for duplicate content: search `site:instantmed.com.au`
- [ ] Review competitor pages: what keywords are they ranking for?
- [ ] Add 5–10 new condition pages

### Annually

- [ ] Full SEO audit: crawl all 50+ pages for issues
- [ ] Update metadata: refresh titles/descriptions for CTR
- [ ] Consolidate thin pages: merge low-traffic pages into hubs
- [ ] Report to stakeholders: traffic, rankings, conversion

---

## Troubleshooting

### Pages not indexing?

1. Verify sitemap: `https://instantmed.com.au/sitemap.xml`
2. Check robots: ensure `/seo/` is not disallowed
3. Submit to GSC: manually request indexing
4. Check for noindex tags: inspect page source
5. Wait 2–4 weeks: Google crawls slowly for new sites

### Low rankings despite good content?

1. Check backlinks: use Ahrefs/Moz to see link profile
2. Improve CTR: test better meta titles/descriptions
3. Add internal links: link from high-authority pages
4. Increase E-E-A-T: add doctor author info, credentials
5. Check for issues: PageSpeed, Core Web Vitals

### Traffic plateau?

1. Add new pages: 5–10 per month
2. Improve top pages: add more detailed content to #1–10 performers
3. Target long-tail: add pages for long-tail keywords (3–5 words)
4. Refresh old content: update evergreen pages with new info
5. Build backlinks: guest posts, PR, citations

---

## Questions & Support

For questions on:
- **Adding new pages:** See `/lib/seo/pages.ts` template
- **Technical issues:** Check route files in `/app/(seo)/`
- **Medical compliance:** Consult with clinical team
- **SEO strategy:** Review Google Search Console data

---

## Summary

✅ **What's included:**
- 50+ high-quality programmatic landing pages
- Typed data layer for easy expansion
- Compliant medical content (no spam, no false claims)
- Auto-updated sitemap & robots
- Internal linking system
- JSON-LD structured data
- SEO-optimized templates

✅ **What to do next:**
1. Build & deploy
2. Submit sitemap to Google Search Console
3. Monitor indexing (1–2 weeks)
4. Add 5–10 new condition pages (monthly)
5. Monitor rankings & traffic (ongoing)

Good luck! 🚀
