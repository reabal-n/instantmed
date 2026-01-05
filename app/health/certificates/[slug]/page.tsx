/**
 * Certificate type pages route
 * /health/certificates/[slug]
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

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getPageBySlug(slug, 'certificates')

  if (!page) {
    return {}
  }

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      url: `https://instantmed.com.au/health/certificates/${slug}`,
      type: 'website',
    },
    alternates: {
      canonical: `https://instantmed.com.au/health/certificates/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return getAllSlugs('certificates').map((slug) => ({
    slug,
  }))
}

export default async function CertificatePage({ params }: PageProps) {
  const { slug } = await params
  const page = getPageBySlug(slug, 'certificates')

  if (!page) {
    notFound()
  }

  return <SEOPageTemplate page={page} pageType="certificate" />
}
