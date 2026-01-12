import { ContactClient } from "./contact-client"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default function ContactPage() {
  return <ContactClient />
}
