/**
 * Resource/FAQ pages route
 * /health/guides/[slug]
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SEOPageTemplate } from '@/components/seo/seo-page-template'
import {
  getPageBySlug,
  getAllSlugs,
} from '@/lib/seo/pages'

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getPageBySlug(slug, 'resources')

  if (!page) {
    return {}
  }

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      url: `https://instantmed.com.au/health/guides/${slug}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://instantmed.com.au/health/guides/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return getAllSlugs('resources').map((slug) => ({
    slug,
  }))
}

export default async function ResourcePage({ params }: PageProps) {
  const { slug } = await params
  const page = getPageBySlug(slug, 'resources')

  if (!page) {
    notFound()
  }

  return <SEOPageTemplate page={page} pageType="resource" />
}
