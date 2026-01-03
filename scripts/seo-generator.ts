/**
 * SEO Page Generator Helper
 * 
 * This script helps expand the programmatic SEO page inventory safely.
 * Use it to add new condition pages, certificate types, benefits, or resources.
 * 
 * IMPORTANT: All content must be:
 * - Factually accurate
 * - Medically compliant (no false claims, no spam)
 * - Useful to users (not thin or doorway)
 * - Linked internally where relevant
 * - Unique (not keyword-stuffed duplicates)
 * 
 * Usage:
 * - Edit /lib/seo/pages.ts directly
 * - Add new pages to the arrays
 * - Run `npm run build` to generate static pages
 * - Test at /seo/conditions/[slug], /seo/certificates/[slug], etc.
 */

/* eslint-disable no-console */

import { conditionPages, getPageCount } from '@/lib/seo/pages'

// ============================================
// PAGE COUNT & VALIDATION
// ============================================

export function logPageInventory() {
  const counts = getPageCount()
  console.log('📊 SEO Page Inventory')
  console.log(`Conditions: ${counts.conditions}`)
  console.log(`Certificates: ${counts.certificates}`)
  console.log(`Benefits: ${counts.benefits}`)
  console.log(`Resources: ${counts.resources}`)
  console.log(`Total: ${counts.total}`)
}

// ============================================
// VALIDATION HELPERS
// ============================================

interface ValidationResult {
  slug: string
  valid: boolean
  warnings: string[]
}

export function validateConditionPage(page: typeof conditionPages[0]): ValidationResult {
  const warnings: string[] = []

  if (!page.slug || page.slug.length < 3) {
    warnings.push('Slug too short or missing')
  }

  if (!page.name || page.name.length < 3) {
    warnings.push('Name too short or missing')
  }

  if (!page.title || page.title.length < 30) {
    warnings.push('Title too short (should be 30+ chars for SEO)')
  }

  if (!page.description || page.description.length < 50) {
    warnings.push('Description too short (should be 50+ chars)')
  }

  if (!page.symptoms || page.symptoms.length < 4) {
    warnings.push('Symptoms should be at least 4 items')
  }

  if (!page.whenToSeeGP || page.whenToSeeGP.length < 3) {
    warnings.push('Red flags should be at least 3 items')
  }

  if (!page.faqs || page.faqs.length < 3) {
    warnings.push('FAQs should be at least 3 items')
  }

  return {
    slug: page.slug,
    valid: warnings.length === 0,
    warnings,
  }
}

export function validateAllPages() {
  console.log('\n✅ Validating all pages...\n')

  const conditionResults = conditionPages.map(validateConditionPage)
  const hasWarnings = conditionResults.some((r) => r.warnings.length > 0)

  if (hasWarnings) {
    console.warn('⚠️ Page warnings:')
    conditionResults
      .filter((r) => r.warnings.length > 0)
      .forEach((result) => {
        console.warn(`\n${result.slug}:`)
        result.warnings.forEach((w) => console.warn(`  - ${w}`))
      })
  } else {
    console.log('✓ All pages pass validation')
  }
}

// ============================================
// INTERNAL LINKING HELPERS
// ============================================

export function getRelatedPages(slug: string) {
  const page = conditionPages.find((p) => p.slug === slug)
  if (!page) return []

  return page.relatedConditions
    .map((related) => conditionPages.find((p) => p.slug === related))
    .filter((p) => p !== undefined)
}

export function generateInternalLinks(slug: string) {
  const related = getRelatedPages(slug)
  const links: Array<{ text: string; href: string }> = []

  related.forEach((page) => {
    if (page) {
      links.push({
        text: page.name,
        href: `/seo/conditions/${page.slug}`,
      })
    }
  })

  // Add benefit pages
  links.push({
    text: 'Why choose online?',
    href: '/seo/why-online-medical-certificate',
  })

  // Add resource pages
  links.push({
    text: 'Medical disclaimer',
    href: '/seo/resources/medical-disclaimer',
  })

  return links
}

// ============================================
// CONTENT QUALITY HELPERS
// ============================================

export function checkContentQuality(text: string): string[] {
  const issues: string[] = []

  // Check for keyword stuffing
  const words = text.toLowerCase().split(/\s+/)
  const wordFreq: Record<string, number> = {}
  words.forEach((word) => {
    if (word.length > 4) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })

  const maxFreq = Math.max(...Object.values(wordFreq))
  if (maxFreq > 10) {
    issues.push(`Keyword stuffing detected: "${Object.keys(wordFreq).find((w) => wordFreq[w] === maxFreq)}" appears ${maxFreq} times`)
  }

  // Check for minimum length
  if (text.length < 300) {
    issues.push('Content too thin (should be 300+ characters)')
  }

  // Check for medical disclaimers
  if (!text.toLowerCase().includes('doctor') && !text.toLowerCase().includes('gp')) {
    issues.push('Should mention seeing a doctor for serious conditions')
  }

  return issues
}

// ============================================
// EXPANSION TEMPLATE
// ============================================

export const conditionPageTemplate = {
  slug: 'template-condition',
  name: 'Template Condition',
  title: 'Template Condition | Description | InstantMed',
  description: 'Get template condition treatment online. Assessment by Australian doctors.',
  h1: 'Template condition — description',
  heroText: 'Suffering from template condition? Get assessment and certificate online.',
  symptoms: [
    'Symptom 1',
    'Symptom 2',
    'Symptom 3',
    'Symptom 4',
    'Symptom 5',
  ],
  whenToSeeGP: [
    'Red flag 1',
    'Red flag 2',
    'Red flag 3',
  ],
  whenWeCanHelp: [
    'Situation 1',
    'Situation 2',
    'Situation 3',
  ],
  howWeHelp: [
    'Step 1',
    'Step 2',
    'Step 3',
  ],
  disclaimers: [
    'Disclaimer 1',
    'Disclaimer 2',
  ],
  faqs: [
    {
      q: 'Question 1?',
      a: 'Answer 1',
    },
    {
      q: 'Question 2?',
      a: 'Answer 2',
    },
    {
      q: 'Question 3?',
      a: 'Answer 3',
    },
  ],
  relatedConditions: ['cold-and-flu'],
}

console.log(`
🎯 SEO Page Generator Helper

This file helps you expand the programmatic SEO inventory safely.

Current inventory:
`)
logPageInventory()

console.log(`

Next steps:
1. Review /lib/seo/pages.ts to understand the data structure
2. Add new pages to the arrays
3. Run validation: npm run seo:validate
4. Build: npm run build
5. Test: Visit /seo/conditions/[slug], /seo/certificates/[slug], etc.

Guidelines:
✓ One-sentence title clearly states benefit
✓ Symptoms/red flags are specific and medically accurate
✓ No guarantees ("instant cure", "always works")
✓ Link to related pages
✓ Include legitimate disclaimers
✓ Unique content, not keyword-stuffed

Questions? See /lib/seo/pages.ts for examples.
`)
