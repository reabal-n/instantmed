import { AboutClient } from "./about-client"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function AboutPage() {
  return <AboutClient />
}
