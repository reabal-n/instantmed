import type { Metadata } from "next"
import Link from "next/link"

import { CenteredHero } from "@/components/heroes"
import { MarketingFooter, MarketingPageShell } from "@/components/marketing"
import { CTABanner } from "@/components/sections"
import { LegalSection, Navbar } from "@/components/shared"
import { CONTACT_EMAIL_COMPLAINTS, CONTACT_EMAIL_PRIVACY } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Complaints",
  description:
    "How to raise a concern or complaint about InstantMed, our 14-day response SLA, and how to escalate to AHPRA or your state health complaints commissioner.",
  alternates: { canonical: "https://instantmed.com.au/complaints" },
  openGraph: {
    title: "Complaints | InstantMed",
    description:
      "How to raise a concern or complaint about InstantMed, our 14-day response SLA, and how to escalate externally.",
    url: "https://instantmed.com.au/complaints",
  },
}

export const revalidate = 86400

const hccc = [
  { state: "NSW", name: "Health Care Complaints Commission (HCCC)", url: "https://www.hccc.nsw.gov.au/" },
  { state: "VIC", name: "Health Complaints Commissioner", url: "https://hcc.vic.gov.au/" },
  { state: "QLD", name: "Office of the Health Ombudsman", url: "https://www.oho.qld.gov.au/" },
  { state: "WA", name: "Health and Disability Services Complaints Office", url: "https://www.hadsco.wa.gov.au/" },
  { state: "SA", name: "Health and Community Services Complaints Commissioner", url: "https://www.hcscc.sa.gov.au/" },
  { state: "TAS", name: "Health Complaints Commissioner", url: "https://www.healthcomplaints.tas.gov.au/" },
  { state: "ACT", name: "ACT Human Rights Commission", url: "https://hrc.act.gov.au/" },
  { state: "NT", name: "Health and Community Services Complaints Commission", url: "https://hcscc.nt.gov.au/" },
]

export default function ComplaintsPage() {
  return (
    <MarketingPageShell>
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1">
          <CenteredHero
            pill="We take complaints seriously"
            title="Complaints and feedback"
            subtitle="How to raise a concern, what we'll do, and how to escalate if you're not satisfied with our response."
          />

          <section className="pb-24 px-4">
            <div className="mx-auto max-w-3xl">
              <div className="bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] p-8 sm:p-12 divide-y divide-border/40">

                {/* Table of contents */}
                <nav aria-label="Contents" className="pb-8">
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Contents</p>
                  <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 list-none">
                    {[
                      [1, "How to raise a complaint"],
                      [2, "What happens next"],
                      [3, "Response timeframes"],
                      [4, "Clinical governance"],
                      [5, "Escalation: AHPRA"],
                      [6, "Escalation: State commissioners"],
                      [7, "Privacy complaints"],
                      [8, "Record of your complaint"],
                    ].map(([n, title]) => (
                      <li key={n}>
                        <a
                          href={`#section-${n}`}
                          className="flex items-baseline gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                        >
                          <span className="text-[10px] font-mono text-muted-foreground/40 group-hover:text-primary/50 shrink-0 w-4">{n}.</span>
                          {title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>

                <LegalSection number="1" title="How to raise a complaint">
                  <p>
                    If you are unhappy with any aspect of the service you received from InstantMed, please let us know.
                    We investigate every complaint and use what we learn to improve our service.
                  </p>
                  <p>
                    The fastest way to lodge a complaint is by email:{" "}
                    <a href={`mailto:${CONTACT_EMAIL_COMPLAINTS}`}>{CONTACT_EMAIL_COMPLAINTS}</a>
                  </p>
                  <p>When you email us, please include:</p>
                  <ul>
                    <li>Your full name and the email address you used with InstantMed</li>
                    <li>The date and type of service (medical certificate, prescription, consult)</li>
                    <li>Your request reference number (if you have it)</li>
                    <li>A clear description of what went wrong and what outcome you are seeking</li>
                  </ul>
                  <p>
                    You do not need to use any specific form, and you do not need legal representation. Plain English is fine.
                  </p>
                </LegalSection>

                <LegalSection number="2" title="What happens next">
                  <p>
                    We acknowledge every complaint within 24 business hours. The Medical Director triages each complaint
                    into one of three categories:
                  </p>
                  <ul>
                    <li>
                      <strong>Clinical complaints</strong> - concerning a clinical decision, a declined request, a prescription,
                      or a medical certificate. Reviewed by the Medical Director.
                    </li>
                    <li>
                      <strong>Service complaints</strong> - concerning billing, refunds, response times, communication,
                      or the platform experience. Reviewed by our operations team.
                    </li>
                    <li>
                      <strong>Privacy complaints</strong> - concerning how your health information was handled. See Section 7.
                    </li>
                  </ul>
                  <p>
                    We will ask follow-up questions by email if we need more information. You do not have to justify your
                    complaint; you just need to describe what happened.
                  </p>
                </LegalSection>

                <LegalSection number="3" title="Response timeframes">
                  <ul>
                    <li><strong>Acknowledgement:</strong> within 24 business hours</li>
                    <li><strong>Service complaints:</strong> resolved or substantively responded to within 48 hours where possible</li>
                    <li><strong>Clinical complaints:</strong> resolved or substantively responded to within 14 calendar days</li>
                    <li><strong>Complex investigations:</strong> if we need longer, we will tell you why and set a revised timeline</li>
                  </ul>
                  <p>
                    These timeframes reflect our own service standard. They are not a guarantee of a specific outcome -
                    only that we will respond substantively within that window.
                  </p>
                </LegalSection>

                <LegalSection number="4" title="Clinical governance">
                  <p>
                    InstantMed currently operates with a single AHPRA-registered Australian GP who serves as both the
                    treating practitioner and the Medical Director. This is an honest disclosure of scale, not a
                    limitation on accountability. Having a named, registered, identifiable clinician responsible for
                    every clinical decision is a feature - it means there is no diffusion of responsibility, no handoff,
                    and no anonymous team behind a logo.
                  </p>
                  <p>
                    The Medical Director:
                  </p>
                  <ul>
                    <li>Holds current, unrestricted AHPRA registration (independently verifiable on the AHPRA public register)</li>
                    <li>Maintains professional indemnity insurance</li>
                    <li>Is subject to the same professional obligations and regulatory oversight as any other registered GP in Australia</li>
                    <li>Can be identified to you on request via <a href={`mailto:${CONTACT_EMAIL_COMPLAINTS}`}>{CONTACT_EMAIL_COMPLAINTS}</a></li>
                  </ul>
                  <p>
                    See our <Link href="/clinical-governance">clinical governance framework</Link> for how protocols are
                    designed, audited, and updated.
                  </p>
                </LegalSection>

                <LegalSection number="5" title="Escalation: AHPRA">
                  <p>
                    If you have a concern about a health practitioner&apos;s conduct, performance, or health, you can make a
                    complaint directly to the Australian Health Practitioner Regulation Agency (AHPRA). You do not need to
                    raise it with us first - but we are happy to help you understand what you are escalating.
                  </p>
                  <p>
                    AHPRA complaints are appropriate when you believe a practitioner has:
                  </p>
                  <ul>
                    <li>Provided care below the expected professional standard</li>
                    <li>Acted unprofessionally</li>
                    <li>Practised outside their scope or training</li>
                    <li>An impairment affecting their ability to practise safely</li>
                  </ul>
                  <p>
                    Visit the AHPRA website at{" "}
                    <a href="https://www.ahpra.gov.au/notifications" target="_blank" rel="noopener noreferrer">
                      ahpra.gov.au/notifications
                    </a>{" "}
                    to submit a notification.
                  </p>
                </LegalSection>

                <LegalSection number="6" title="Escalation: State health complaints commissioners">
                  <p>
                    Every Australian state and territory has an independent health complaints body. You can contact the
                    commissioner in the state where you received care, regardless of our location:
                  </p>
                  <ul>
                    {hccc.map((h) => (
                      <li key={h.state}>
                        <strong>{h.state}</strong> -{" "}
                        <a href={h.url} target="_blank" rel="noopener noreferrer">
                          {h.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p>
                    These bodies are independent of InstantMed and can investigate complaints we cannot resolve internally.
                  </p>
                </LegalSection>

                <LegalSection number="7" title="Privacy complaints">
                  <p>
                    If your complaint is specifically about how we have handled your health information (collection, use,
                    disclosure, or security), email{" "}
                    <a href={`mailto:${CONTACT_EMAIL_PRIVACY}`}>{CONTACT_EMAIL_PRIVACY}</a>.
                    Privacy complaints are reviewed against the Australian Privacy Principles (APP 1-13) under the
                    Privacy Act 1988.
                  </p>
                  <p>
                    If you are not satisfied with our response, you can escalate to the Office of the Australian
                    Information Commissioner (OAIC) at{" "}
                    <a href="https://www.oaic.gov.au/privacy/privacy-complaints" target="_blank" rel="noopener noreferrer">
                      oaic.gov.au
                    </a>.
                  </p>
                </LegalSection>

                <LegalSection number="8" title="Record of your complaint">
                  <p>
                    We keep a formal register of every complaint, the investigation, the outcome, and any resulting
                    process change. This register is reviewed by the Medical Director at least quarterly and is a
                    structural input into our quality improvement cycle.
                  </p>
                  <p>
                    Making a complaint will never affect your access to our service or the clinical decisions made about
                    your care. We treat complaints as information that helps us improve, not as a signal to push back.
                  </p>
                </LegalSection>

              </div>
            </div>
          </section>
        </main>

        <CTABanner
          title="Something on your mind?"
          subtitle="We read every email. Tell us what happened and we'll look into it."
          ctaText="Email us"
          ctaHref={`mailto:${CONTACT_EMAIL_COMPLAINTS}`}
          secondaryText="Back to help"
          secondaryHref="/contact"
        />

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
