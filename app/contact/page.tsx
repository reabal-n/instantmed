import { ContactClient } from "./contact-client"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function ContactPage() {
  return <ContactClient />
}
