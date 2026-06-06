import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AuthorityAssetPage } from "@/components/marketing/authority-asset-page"
import { BreadcrumbSchema } from "@/components/seo"
import {
  AUTHORITY_ASSET_SLUGS,
  AUTHORITY_ASSETS,
  type AuthorityAsset,
  getAuthorityAsset,
} from "@/lib/authority-assets"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

const baseUrl = "https://instantmed.com.au"

interface PageProps {
  params: Promise<{ slug: string }>
}

function hasAuthorityAsset(slug: string) {
  return AUTHORITY_ASSET_SLUGS.some((knownSlug) => knownSlug === slug)
}

function buildAuthorityAssetImages(asset: AuthorityAsset) {
  return (asset.visuals ?? []).map((visual) => ({
    url: `${baseUrl}${visual.assetPath}`,
    width: 1440,
    height: 1080,
    alt: visual.alt,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  if (!hasAuthorityAsset(slug)) {
    return {}
  }

  const asset = getAuthorityAsset(slug)
  const authorityImages = buildAuthorityAssetImages(asset)

  return {
    title: { absolute: asset.metadataTitle },
    description: asset.description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${baseUrl}/resources/${asset.slug}`,
    },
    openGraph: {
      title: asset.metadataTitle,
      description: asset.description,
      url: `${baseUrl}/resources/${asset.slug}`,
      type: "article",
      images: authorityImages,
    },
    twitter: authorityImages.length
      ? {
          card: "summary_large_image",
          images: authorityImages.map((image) => image.url),
        }
      : undefined,
  }
}

export function generateStaticParams() {
  return AUTHORITY_ASSETS.map((asset) => ({ slug: asset.slug }))
}

export default async function AuthorityAssetRoute({ params }: PageProps) {
  const { slug } = await params

  if (!hasAuthorityAsset(slug)) {
    notFound()
  }

  const asset = getAuthorityAsset(slug)
  const assetUrl = `${baseUrl}/resources/${asset.slug}`
  const authorityImages = buildAuthorityAssetImages(asset)
  const imageUrls = authorityImages.map((image) => image.url)
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    headline: asset.title,
    description: asset.description,
    url: assetUrl,
    dateModified: "2026-06-06",
    lastReviewed: "2026-06-06",
    inLanguage: "en-AU",
    isAccessibleForFree: true,
    image: imageUrls,
    thumbnailUrl: imageUrls[0],
    primaryImageOfPage: authorityImages[0]
      ? {
          "@type": "ImageObject",
          url: authorityImages[0].url,
          width: authorityImages[0].width,
          height: authorityImages[0].height,
          caption: authorityImages[0].alt,
        }
      : undefined,
    publisher: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`,
      name: "InstantMed",
      url: baseUrl,
    },
    citation: asset.sources.map((source) => source.url),
    about: asset.sections.map((section) => section.claim),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl },
          { name: "Authority resources", url: `${baseUrl}/resources` },
          { name: asset.title, url: assetUrl },
        ]}
      />
      <AuthorityAssetPage asset={asset} />
    </>
  )
}
