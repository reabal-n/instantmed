import { generateSEOPageOG, ogSize, ogContentType } from "@/lib/og/seo-page-og"
import { conditionsData } from "@/lib/seo/data/conditions"

export const runtime = "edge"
export const alt = "InstantMed Health Condition"
export const size = ogSize
export const contentType = ogContentType

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const condition = conditionsData[slug]

  return generateSEOPageOG({
    title: condition?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    subtitle: condition?.description?.slice(0, 120),
    category: "Health Condition",
    categoryColor: "#3B82F6",
  })
}
