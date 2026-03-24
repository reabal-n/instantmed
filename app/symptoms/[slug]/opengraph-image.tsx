import { generateSEOPageOG, ogSize, ogContentType } from "@/lib/og/seo-page-og"

export const runtime = "edge"
export const alt = "InstantMed Symptom Guide"
export const size = ogSize
export const contentType = ogContentType

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  return generateSEOPageOG({
    title: name,
    subtitle: "Understand your symptoms and when to see a doctor",
    category: "Symptom Guide",
    categoryColor: "#F59E0B",
  })
}
