/**
 * Benefit pages route
 * /health/why-[slug]
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SEOPageTemplate } from '@/components/seo/seo-page-template'
import {
  getPageBySlug,
  getAllSlugs,
} from '@/lib/seo/pages'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getPageBySlug(slug, 'benefits')

  if (!page) {
    return {}
  }

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      url: `https://instantmed.com.au/health/why-${slug}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://instantmed.com.au/health/why-${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return getAllSlugs('benefits').map((slug) => ({
    slug,
  }))
}

export default async function BenefitPage({ params }: PageProps) {
  const { slug } = await params
  const page = getPageBySlug(slug, 'benefits')

  if (!page) {
    notFound()
  }

  return <SEOPageTemplate page={page} pageType="benefit" />
}
