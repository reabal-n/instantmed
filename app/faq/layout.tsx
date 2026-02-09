export { metadata } from "./metadata"

// Revalidate every 24 hours — FAQ content is mostly static
export const revalidate = 86400

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
