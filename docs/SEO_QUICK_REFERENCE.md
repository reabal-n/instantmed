# Quick Reference: Adding New SEO Pages

## How to Add a New Condition Page (2 minutes)

### Step 1: Open `lib/seo/pages.ts`

Find the `conditionPages` array and add a new object:

```typescript
{
  slug: "sore-throat",
  name: "Sore Throat",
  title: "Sore Throat Treatment | Medical Certificate | InstantMed",
  description: "Painful sore throat? Get a medical certificate. Online assessment of throat pain and infection.",
  h1: "Throat pain making work miserable?",
  heroText: "Sore throat affecting your ability to work? Get a medical certificate and advice on relief.",
  symptoms: [
    "Pain when swallowing",
    "Scratchy or raw throat",
    "Redness (if you can see)",
    "Swollen tonsils",
    "Hoarse voice",
    "Sometimes with fever",
  ],
  whenToSeeGP: [
    "Severe pain or difficulty swallowing",
    "High fever with sore throat",
    "Swollen throat closing airway",
    "Concerns about strep throat",
  ],
  whenWeCanHelp: [
    "You have a sore throat and can't work",
    "You need a medical certificate",
    "You want advice on self-care",
  ],
  howWeHelp: [
    "Describe your throat pain and symptoms",
    "Our doctor assesses",
    "Medical certificate if appropriate",
  ],
  disclaimers: [
    "Most sore throats are viral — antibiotics don't help.",
    "If throat swelling affects breathing, seek urgent help.",
  ],
  faqs: [
    {
      q: "Do I need antibiotics for a sore throat?",
      a: "Only if it's bacterial (strep). Most sore throats are viral. Your doctor will advise.",
    },
    {
      q: "What helps a sore throat?",
      a: "Warm drinks, throat lozenges, paracetamol, rest. Honey and lemon can soothe.",
    },
  ],
  relatedConditions: ["cold-and-flu"],
}
```

### Step 2: Build & Deploy

```bash
npm run build
git add -A
git commit -m "feat: add sore-throat condition page"
git push origin main
# Vercel auto-deploys
```

### Step 3: Verify

Visit: `https://instantmed.com.au/health/conditions/sore-throat`

**That's it!** The page is live, indexed in sitemap, and linked internally.

---

## Validation Checklist

Before committing:

- [ ] **Slug**: Lowercase, hyphens, 3+ chars (e.g., `sore-throat`)
- [ ] **Title**: 50–60 chars, includes keyword (e.g., "Sore Throat | Medical Certificate")
- [ ] **Description**: 120–150 chars, unique from other pages
- [ ] **H1**: Engaging, user-focused (e.g., "Throat pain making work miserable?")
- [ ] **Symptoms**: 5+ items, medically accurate
- [ ] **Red Flags**: 3+ items, emergency-focused
- [ ] **FAQs**: 3+ items, answers common questions
- [ ] **Related**: 1–3 links to related condition slugs
- [ ] **No Claims**: No "instant", "cure", "100% effective"
- [ ] **Disclaimer**: Includes "call 000" or "see GP" language

---

## Common Mistakes to Avoid

❌ **Too generic:**  
```
title: "Health Information"
description: "Learn about health"
```

✅ **Specific & keyword-focused:**  
```
title: "Sore Throat Treatment Online | Medical Certificate | InstantMed"
description: "Painful sore throat? Get a medical certificate and treatment advice online."
```

---

❌ **False claims:**  
```
"Get instant relief with our doctors"
"Guaranteed to be better in 24 hours"
```

✅ **Honest, compliant:**  
```
"Most people feel relief within 24-48 hours of starting antibiotics"
"Our doctors can assess and prescribe treatment if appropriate"
```

---

❌ **Missing red flags:**  
```
whenToSeeGP: ["Very bad sore throat"]
```

✅ **Specific, emergency-focused:**  
```
whenToSeeGP: [
  "Severe pain or difficulty swallowing",
  "High fever with sore throat",
  "Swollen throat closing airway",
  "Concerns about strep throat",
]
```

---

## URLs After Adding

Once you add `sore-throat` to `conditionPages`:

- **Page URL**: `/health/conditions/sore-throat`
- **In Sitemap**: Auto-included (next build)
- **In Robots**: Auto-allowed
- **Related Links**: Auto-linked to/from `cold-and-flu` etc.
- **Metadata**: Auto-generated from `title` + `description`

---

## Template for Copy-Paste

```typescript
{
  slug: "new-condition",
  name: "New Condition",
  title: "New Condition | Medical Certificate | InstantMed", // 50-60 chars
  description: "Get new condition treatment. Online assessment. Keep under 150 chars.",
  h1: "Catchy headline about new condition",
  heroText: "User-focused hero message (2-3 sentences).",
  symptoms: [
    "Symptom 1",
    "Symptom 2",
    "Symptom 3",
    "Symptom 4",
    "Symptom 5",
  ],
  whenToSeeGP: [
    "Emergency sign 1",
    "Emergency sign 2",
    "Emergency sign 3",
  ],
  whenWeCanHelp: [
    "Scenario 1 we handle",
    "Scenario 2 we handle",
    "Scenario 3 we handle",
  ],
  howWeHelp: [
    "Step 1",
    "Step 2",
    "Step 3",
    "Step 4 (optional)",
  ],
  disclaimers: [
    "Disclaimer 1",
    "Disclaimer 2",
  ],
  faqs: [
    { q: "Common question?", a: "Clear answer." },
    { q: "Another question?", a: "Another answer." },
    { q: "Third question?", a: "Third answer." },
  ],
  relatedConditions: ["cold-and-flu", "sore-throat"],
}
```

---

## Current Pages (Reference)

**Condition Pages (16 total):**
- cold-and-flu
- gastro
- migraine
- back-pain
- hay-fever
- thrush
- anxiety
- insomnia
- headache
- stress-exhaustion
- uti
- acne
- eczema
- dizziness
- food-poisoning
- sore-throat

**Certificate Pages (3 total):**
- work-medical-certificate
- study-medical-certificate
- carer-leave-certificate

**Benefit Pages (1 total):**
- why-online-medical-certificate

**Resource Pages (2 total):**
- faq-medical-eligibility
- medical-disclaimer

---

## Integration with Start Flow

All pages CTA button links to `/start`:

```tsx
<Button asChild>
  <Link href="/start">
    Start online consult
    <ChevronRight className="ml-2 h-4 w-4" />
  </Link>
</Button>
```

**Users path:**  
1. Google: "sore throat medical certificate"
2. Land on `/health/conditions/sore-throat`
3. Read symptoms, process, FAQs
4. Click "Start online consult"
5. → `/start` (intake flow)
6. Complete questionnaire
7. Doctor reviews
8. Certificate issued

---

## Monitoring Tips

### Google Search Console
- Monitor: `/health/conditions/` pages
- Check: Average position, impressions, clicks
- Goal: Position 1–10 for each condition keyword

### Monthly Actions
- [ ] Check top 10 pages in GSC
- [ ] Identify low-ranking pages (<20)
- [ ] Add internal links to boost low performers
- [ ] Update meta titles/descriptions if CTR is low

### Quarterly
- [ ] Add 5–10 new condition pages
- [ ] Review competitor pages for gaps
- [ ] Check for duplicate content
- [ ] Update stale medical information

---

## File Locations

- **Data**: `/lib/seo/pages.ts`
- **Template**: `/components/seo/seo-page-template.tsx`
- **Routes**: `/app/health/conditions/[slug]/page.tsx`, etc.
- **Sitemap**: `/app/sitemap.ts` (auto-updated)
- **Guide**: `/SEO_SYSTEM_GUIDE.md`
- **This file**: `/SEO_QUICK_REFERENCE.md`

---

## Questions?

1. **How do I test a new page locally?**  
   → Build: `npm run build`  
   → Run: `npm start`  
   → Visit: `http://localhost:3000/health/conditions/cold-and-flu`

2. **Do I need to manually update the sitemap?**  
   → No! It's auto-generated from `lib/seo/pages.ts`

3. **How long until a page ranks?**  
   → 4–12 weeks for initial rankings. High-authority sites can rank faster.

4. **Can I delete a page?**  
   → Remove from `lib/seo/pages.ts` and rebuild. Old URL will 404.  
   → To preserve SEO: set up a redirect in `next.config.mjs`

5. **What if a page has errors?**  
   → Fix in `lib/seo/pages.ts` and rebuild.  
   → Check browser console for React/TypeScript errors.

---

Happy expanding! 🚀
