import { generateSEOPageOG, ogSize, ogContentType } from "@/lib/og/seo-page-og"

export const runtime = "edge"
export const alt = "InstantMed Medication Information"
export const size = ogSize
export const contentType = ogContentType

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  return generateSEOPageOG({
    title: name,
    subtitle: "Doctor-reviewed medication information for Australians",
    category: "Medication Info",
    categoryColor: "#22C55E",
  })
}
