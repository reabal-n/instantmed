import { BadgeCheck } from "lucide-react"
import Link from "next/link"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS: Array<{
  id: string
  sticker: StickerIconName
  title: string
  paragraphs: readonly string[]
}> = [
  {
    id: "what-to-expect",
    sticker: "stethoscope",
    title: "What to expect from a telehealth consultation",
    paragraphs: [
      "When you request a consultation through InstantMed, you're not talking to a chatbot or filling in a form that disappears into a queue. You're submitting your health concern to an AHPRA-registered doctor who reviews your case individually. You'll describe your symptoms, medical history, and what you're hoping to address - the same information you'd share in a GP waiting room, minus the waiting room.",
      "From there, the doctor determines the best approach based on clinical need. Some conditions can be assessed entirely from your history and description - a straightforward UTI, a medication review, or a recurring issue you've managed before. Others benefit from a phone call, where the doctor can ask follow-up questions, clarify symptoms, or discuss treatment options in real time. You don't need to guess which category you fall into. The doctor makes that call.",
      "Most consultations are reviewed within a couple of hours. If additional information is needed, the doctor will reach out directly. There's no algorithm deciding your care - just a doctor reading your case and making a clinical judgement, the same way they would in a clinic.",
    ],
  },
  {
    id: "what-doctor-can-do",
    sticker: "checklist",
    title: "What a doctor can do in an online consult",
    paragraphs: [
      "Telehealth consultations cover a broader range of care than most people expect. Your doctor can prescribe medication and send it as an eScript to any pharmacy in Australia - no paper scripts, no faxes, no chasing up. They can provide treatment advice for your condition, recommend over-the-counter options, or adjust an existing treatment plan that isn't working.",
      "Beyond prescriptions, your doctor can order pathology and blood tests, write referral letters to specialists, and issue medical certificates if your condition warrants time off work. They can also advise on next steps - whether that's monitoring symptoms at home, booking an in-person follow-up, or heading to a hospital if something needs urgent attention.",
      "The scope is deliberately broad. If you'd normally see a GP for it and it doesn't require a physical examination, there's a good chance it can be handled online. Non-emergency health concerns - from skin issues to digestive problems to mental health check-ins - are well suited to this format.",
    ],
  },
  {
    id: "when-right",
    sticker: "checkmark",
    title: "When telehealth is right for your concern",
    paragraphs: [
      "Telehealth works well when the doctor's assessment depends primarily on what you tell them rather than what they can physically examine. That covers more ground than you might think. Skin conditions - especially with clear photos - can often be assessed remotely. Urinary tract infections, seasonal allergies, and minor infections follow predictable patterns where your symptoms and history tell the story.",
      "Mental health check-ins, medication reviews, and follow-ups for stable ongoing conditions are particularly well suited to telehealth. If you've been managing a condition for a while and need a script renewed or an adjustment discussed, there's limited clinical value in sitting in a waiting room for 45 minutes. Similarly, if you want a second opinion or need advice on whether something warrants further investigation, a telehealth consult gives you access to a doctor without rearranging your day.",
      "The common thread is that these conditions can be assessed through conversation and clinical history. The doctor isn't guessing - they're applying the same diagnostic reasoning they'd use face-to-face, with information that translates well to a remote format.",
    ],
  },
  {
    id: "when-in-person",
    sticker: "warning",
    title: "When you need to see a doctor in person",
    paragraphs: [
      "Some things genuinely need hands-on assessment, and we're upfront about that. If you've found a lump, injured a joint, or are experiencing chest pain, shortness of breath, or severe abdominal pain - see a doctor in person or call 000. These are conditions where physical examination, imaging, or immediate intervention may be necessary, and telehealth can't replicate that.",
      "Anything requiring a procedure - stitches, injections, wound care, or physical manipulation - needs an in-person visit. Complex presentations in children under 18, particularly infants and young children, should generally be assessed face-to-face where a doctor can observe the patient directly.",
      "We don't see this as a limitation - it's a feature. Knowing where telehealth ends and in-person care begins is a sign that your doctor is prioritising your safety over convenience. If your concern falls outside what can be responsibly assessed remotely, we'll tell you, and we'll recommend the appropriate next step. No one benefits from a doctor stretching beyond what the format supports.",
    ],
  },
  {
    id: "privacy",
    sticker: "lock",
    title: "Your privacy and what we share",
    paragraphs: [
      "Doctor-patient confidentiality applies to telehealth consultations in exactly the same way it applies to an in-person visit. Your doctor is bound by the same legal and ethical obligations regardless of whether they're across a desk or across the internet. Your health information is protected under the Privacy Act 1988 and the Australian Privacy Principles.",
      "On a technical level, your health data is encrypted using AES-256-GCM - the same standard used by banks and government agencies. Information is stored in Australian data centres and access is restricted to the treating doctor and essential clinical staff. We don't share your information with employers, insurers, or any third party without your explicit consent.",
      "One detail worth noting: because InstantMed consultations are private (not bulk-billed through Medicare), no record of your visit appears on your Medicare claims history. If you choose private telehealth, that's a genuinely private interaction. Your employer won't know, your insurer won't know, and it won't show up on any government record.",
    ],
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - telehealth consult process, scope, privacy */
export function ConsultGuideSection() {
  return (
    <section
      aria-label="Telehealth consultation guide"
      className="py-20 lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered GPs
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Everything you need to know about online consultations
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            How it works, what we can help with, and when you should see someone
            in person instead.
          </p>
        </Reveal>

        {/* Content sections */}
        <div className="space-y-12">
          {GUIDE_SECTIONS.map((section, i) => (
            <Reveal key={section.id} delay={i * 0.05}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  <StickerIcon name={section.sticker} size={36} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.paragraphs.map((p, j) => (
                      <p
                        key={j}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        {p}
                      </p>
                    ))}
                    {section.id === "privacy" && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        For more detail on how we handle your data, see our{" "}
                        <Link
                          href="/privacy"
                          className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          privacy policy
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Clinical governance link */}
        <div className="mt-12 pt-8 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            All clinical decisions are made by AHPRA-registered doctors following{" "}
            <Link
              href="/clinical-governance"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              our clinical governance framework
            </Link>
            . We never automate clinical decisions.
          </p>
        </div>
      </div>
    </section>
  )
}
