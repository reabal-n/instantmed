import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import { JsonLdScript } from "./json-ld-script"

interface HowToStep {
  name: string
  text: string
  image?: string
  url?: string
}

interface HowToSchemaProps {
  name: string
  description: string
  steps: HowToStep[]
  totalTime?: string
  estimatedCost?: string
  baseUrl?: string
}

/**
 * Schema.org HowTo structured data for process pages
 * Helps with rich snippets for "how to get medical certificate" searches
 */
export function HowToSchema({
  name,
  description,
  steps,
  totalTime,
  estimatedCost,
  baseUrl = "https://instantmed.com.au"
}: HowToSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    ...(totalTime && { totalTime }),
    ...(estimatedCost && {
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "AUD",
        value: estimatedCost
      }
    }),
    tool: {
      "@type": "HowToTool",
      name: "Internet-connected device (phone, tablet, or computer)"
    },
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: {
          "@type": "ImageObject",
          url: step.image.startsWith("http") ? step.image : `${baseUrl}${step.image}`
        }
      }),
      ...(step.url && { url: step.url })
    })),
    provider: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`
    }
  }

  return <JsonLdScript id="howto-schema" data={schema} />
}

/**
 * Pre-configured HowTo schema for medical certificate process
 */
export function MedCertHowToSchema({ baseUrl = "https://instantmed.com.au" }: { baseUrl?: string }) {
  return (
    <HowToSchema
      name="How to Get a Medical Certificate Online in Australia"
      description="Request a routine sick, study, or carer's leave certificate from an AHPRA-registered doctor online. No appointment needed."
      estimatedCost={PRICING.MED_CERT.toFixed(2)}
      baseUrl={baseUrl}
      steps={[
        {
          name: "Fill out a quick form",
          text: "Tell us about your symptoms and how long you need off. Takes about 3 minutes."
        },
        {
          name: "Verify your identity",
          text: "Provide your details including name, date of birth, and contact information. Medicare is optional for medical certificates."
        },
        {
          name: "Make payment",
          text: `Pay securely online. 1-day certificates ${PRICING_DISPLAY.MED_CERT}, 2-day certificates ${PRICING_DISPLAY.MED_CERT_2DAY}.`
        },
        {
          name: "Clinical pathway reviews your request",
          text: getApprovedClaim("clinical_decision_model")
        },
        {
          name: "Receive your certificate",
          text: "If approved, your medical certificate is emailed to you as a secure PDF."
        }
      ]}
    />
  )
}

/**
 * Pre-configured HowTo schema for prescription process
 */
export function PrescriptionHowToSchema({ baseUrl = "https://instantmed.com.au" }: { baseUrl?: string }) {
  return (
    <HowToSchema
      name="How to Get a Prescription Online in Australia"
      description="Request a prescription from an AHPRA-registered doctor online. If approved, your eScript is sent directly to your phone."
      estimatedCost={PRICING.REPEAT_SCRIPT.toFixed(2)}
      baseUrl={baseUrl}
      steps={[
        {
          name: "Select your medication",
          text: "Enter the name, strength, and dose of the regular medication you want the doctor to review."
        },
        {
          name: "Answer clinical questions",
          text: "Provide information about your health history and current medications. This helps the doctor make a safe decision."
        },
        {
          name: "Verify your identity",
          text: "Enter your details including Medicare number or IHI (required for eScript). Your address is needed for prescribing compliance."
        },
        {
          name: "Make payment",
          text: `Pay securely online. Prescriptions are ${PRICING_DISPLAY.REPEAT_SCRIPT}.`
        },
        {
          name: "Doctor reviews your request",
          text: `${getApprovedClaim("doctor_registration")} They may ask for more information or call before deciding. ${getApprovedClaim("availability_24_7")}`
        },
        {
          name: "Receive your eScript",
          text: "If approved, your eScript QR code is sent via SMS to your phone. Take it to any pharmacy in Australia to fill."
        }
      ]}
    />
  )
}
