import { AboutClient } from "./about-client"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default function AboutPage() {
  return <AboutClient />
}
