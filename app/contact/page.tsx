import type { Metadata } from "next"
import { ContactClient } from "./contact-client"

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with InstantMed. Our support team is here to help with any questions about our telehealth services, medical certificates, or prescriptions.",
  openGraph: {
    title: "Contact InstantMed | Get Support",
    description: "Contact our support team for help with telehealth services, medical certificates, and prescriptions.",
  },
}

export default function ContactPage() {
  return <ContactClient />
}
