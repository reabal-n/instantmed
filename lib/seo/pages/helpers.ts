/**
 * SEO page query/lookup helpers.
 */

import { benefitPages, certificatePages, conditionPages, resourcePages } from "./definitions"
import type { BenefitPage, CertificatePage, ConditionPage, ResourcePage } from "./types"

export function getAllPages() {
  return {
    conditions: conditionPages,
    certificates: certificatePages,
    benefits: benefitPages,
    resources: resourcePages,
  }
}

export function getPageCount() {
  return {
    conditions: conditionPages.length,
    certificates: certificatePages.length,
    benefits: benefitPages.length,
    resources: resourcePages.length,
    total: conditionPages.length + certificatePages.length + benefitPages.length + resourcePages.length,
  }
}

export function getAllSlugs(pageType: 'conditions' | 'certificates' | 'benefits' | 'resources') {
  const pages = getAllPages()
  return pages[pageType].map((p: ConditionPage | CertificatePage | BenefitPage | ResourcePage) => p.slug)
}

export function getPageBySlug(slug: string, pageType: 'conditions' | 'certificates' | 'benefits' | 'resources') {
  const pages = getAllPages()
  return pages[pageType].find((p: ConditionPage | CertificatePage | BenefitPage | ResourcePage) => p.slug === slug)
}
