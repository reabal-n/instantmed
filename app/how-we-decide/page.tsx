import type { Metadata } from "next"
import {
  Eye,
  ShieldCheck,
  ClipboardCheck,
  Stethoscope,
  Heart,
  MessageCircle,
  AlertCircle,
  UserCheck,
} from "lucide-react"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { CenteredHero } from "@/components/heroes"
import {
  FeatureGrid,
  IconChecklist,
  ProcessSteps,
  CTABanner,
} from "@/components/sections"
import type { FeatureItem, ChecklistItem, ProcessStep } from "@/components/sections"

export const metadata: Metadata = {
  title: "How Doctors Review Your Request",
  description:
    "Learn how our doctors assess requests, why some are declined, and how we prioritise your safety. No algorithms — just real medical judgment.",
  openGraph: {
    title: "How We Make Decisions | InstantMed",
    description:
      "Every request is reviewed by a real Australian doctor. Here's what they look at and how they decide.",
  },
}

const reviewFactors: FeatureItem[] = [
  {
    icon: <ClipboardCheck className="h-5 w-5" />,
    title: "What you've told us",
    description:
      "Your symptoms, how long you've been unwell, and anything else that helps paint the picture.",
  },
  {
    icon: <Stethoscope className="h-5 w-5" />,
    title: "Your medical background",
    description:
      "Conditions you've mentioned, medications you're on, and anything that might affect what's safe for you.",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "What you're asking for",
    description:
      "Whether it's a certificate, a script renewal, or something else — and whether that makes sense given everything above.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Clinical guidelines",
    description:
      "The same rules any doctor follows. Some things just need to be done in person. We don\u2019t bend on that.",
  },
]

const declineReasons: ChecklistItem[] = [
  {
    text: "You might need to be seen in person",
    subtext:
      "Some things really do need a physical exam. It\u2019s not us being difficult \u2014 it\u2019s just the nature of medicine.",
  },
  {
    text: "The medication needs monitoring",
    subtext:
      "Certain scripts require blood tests or regular check-ins. We can\u2019t skip those steps.",
  },
  {
    text: "Something sounds more serious",
    subtext:
      "If your symptoms suggest you should see someone urgently, we\u2019ll tell you. That\u2019s not a decline \u2014 that\u2019s looking out for you.",
  },
  {
    text: "We need more information",
    subtext:
      "Sometimes the answer is just \u2018tell us more.\u2019 The doctor might reach out before making a final call.",
  },
  {
    text: "It\u2019s outside what telehealth can do",
    subtext:
      "There are limits to what any doctor can safely do without seeing you. We work within them.",
  },
]

const safetyFeatures: FeatureItem[] = [
  {
    icon: <UserCheck className="h-5 w-5" />,
    title: "Real doctors, real accountability",
    description:
      "Every reviewer is an AHPRA-registered doctor. They put their name on every decision.",
  },
  {
    icon: <Heart className="h-5 w-5" />,
    title: "No pressure to approve",
    description:
      "Our doctors aren\u2019t paid to say yes. They\u2019re paid to get it right. Big difference.",
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: "We reach out when it matters",
    description:
      "If something\u2019s unclear, the doctor will contact you. We\u2019d rather ask than assume.",
  },
  {
    icon: <AlertCircle className="h-5 w-5" />,
    title: "Honest about our limits",
    description:
      "If you need in-person care, we\u2019ll say so. We\u2019re not trying to handle everything \u2014 just the things we can do well.",
  },
]

const afterSubmitSteps: ProcessStep[] = [
  {
    number: 1,
    title: "A doctor reviews your request",
    description:
      "Usually within a few hours. They look at everything you've shared and make a decision.",
  },
  {
    number: 2,
    title: "You hear back",
    description:
      "Approved? Your certificate or script is on its way. Declined? Full refund, no drama.",
  },
  {
    number: 3,
    title: "Questions? They'll ask",
    description:
      "If anything's unclear, the doctor reaches out before deciding. We don\u2019t guess.",
  },
]

export default function HowWeDecidePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        <CenteredHero
          pill="Our Process"
          title="Every request gets a real review"
          highlightWords={["real review"]}
          subtitle="No algorithms deciding your health. No rubber stamps. Just a doctor looking at your request and making a call — the same way they would if you were sitting across from them."
        />

        <FeatureGrid
          title="What the doctor looks at"
          subtitle="The same stuff they'd consider if you walked into a clinic. Nothing more, nothing less."
          features={reviewFactors}
          columns={2}
        />

        <IconChecklist
          title="Why some requests aren't approved"
          subtitle="It's not personal. It's a doctor doing their job properly. Here are the usual reasons."
          items={declineReasons}
        />

        <p className="mx-auto max-w-3xl text-center text-sm text-muted-foreground px-4 -mt-12 mb-8">
          If your request is declined, you get a{" "}
          <span className="font-medium text-foreground">full refund</span>. No
          hassle.
        </p>

        <FeatureGrid
          title="Your safety comes first"
          subtitle="We'd rather lose a sale than cut corners on care. That's not marketing — it's just how we work."
          features={safetyFeatures}
          columns={2}
        />

        <ProcessSteps
          title="What happens after you submit"
          subtitle="No surprises. Here's exactly what to expect."
          steps={afterSubmitSteps}
        />

        <CTABanner
          title="Still have questions?"
          subtitle="We're happy to explain more. Our support team is real people who actually reply."
          ctaText="Get in touch"
          ctaHref="/contact"
          secondaryText="Read FAQs"
          secondaryHref="/faq"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
