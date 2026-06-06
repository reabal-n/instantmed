import {
  AUTHORITY_ASSETS,
  type AuthorityAssetCategory,
  type AuthorityAssetSlug,
} from "@/lib/authority-assets"

export interface AuthorityResourceTrackingTarget {
  priority: number
  slug: AuthorityAssetSlug
  title: string
  category: AuthorityAssetCategory
  url: string
  naturalAnchor: string
  outreachAngle: string
}

const DEFAULT_SITE_ORIGIN = "https://instantmed.com.au"

export function getAuthorityResourceTrackingTargets(
  siteOrigin = DEFAULT_SITE_ORIGIN,
): AuthorityResourceTrackingTarget[] {
  return AUTHORITY_ASSETS.map((asset, index) => ({
    priority: index + 1,
    slug: asset.slug as AuthorityAssetSlug,
    title: asset.title,
    category: asset.category,
    url: `${siteOrigin}/resources/${asset.slug}`,
    naturalAnchor: asset.title,
    outreachAngle: asset.summary,
  }))
}
