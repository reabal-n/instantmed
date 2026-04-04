import Link from "next/link"
import { ArrowRight, Stethoscope, Activity, BookOpen, FileText } from "lucide-react"

interface ContentLink {
  href: string
  label: string
  description?: string
}

interface ContentHubLinksProps {
  /** Which service this page is for — determines relevant cross-links */
  service: "med-cert" | "prescriptions" | "general-consult"
}

const SERVICE_LINKS: Record<string, {
  conditions: ContentLink[]
  symptoms: ContentLink[]
  guides: ContentLink[]
  blog: ContentLink[]
}> = {
  "med-cert": {
    conditions: [
      { href: "/medical-certificate/flu", label: "Flu", description: "One of the most common reasons for a sick note" },
      { href: "/medical-certificate/gastro", label: "Gastro", description: "Stomach bugs that keep you home from work" },
      { href: "/medical-certificate/back-pain", label: "Back Pain", description: "Certificates for acute and chronic back issues" },
      { href: "/medical-certificate/migraine", label: "Migraine", description: "When a headache stops you from working" },
      { href: "/medical-certificate/anxiety", label: "Anxiety / Mental Health", description: "Mental health days are valid medical leave" },
      { href: "/medical-certificate/covid", label: "COVID-19", description: "Isolation and recovery certificates" },
    ],
    symptoms: [
      { href: "/symptoms/sore-throat", label: "Sore Throat" },
      { href: "/symptoms/fever", label: "Fever" },
      { href: "/symptoms/cough", label: "Cough" },
      { href: "/symptoms/fatigue", label: "Fatigue" },
      { href: "/symptoms/nausea", label: "Nausea" },
      { href: "/symptoms/headache", label: "Headache" },
    ],
    guides: [
      { href: "/guides/how-to-get-medical-certificate-for-work", label: "How to get a medical certificate for work" },
      { href: "/guides/telehealth-guide-australia", label: "Telehealth guide for Australians" },
      { href: "/prescriptions", label: "Need a repeat prescription? →" },
    ],
    blog: [
      { href: "/blog/medical-certificate-online-australia", label: "Can you get a med cert online in Australia?" },
      { href: "/blog/employer-accept-online-medical-certificate", label: "Do employers accept online medical certificates?" },
      { href: "/blog/sick-leave-rights-australia", label: "Your sick leave rights in Australia" },
    ],
  },
  "prescriptions": {
    conditions: [
      { href: "/conditions/hay-fever", label: "Hay Fever", description: "Antihistamine and nasal spray renewals" },
      { href: "/conditions/uti", label: "UTI", description: "Urinary tract infection treatment" },
      { href: "/conditions/skin-rash", label: "Skin Rash", description: "Topical treatment prescriptions" },
      { href: "/conditions/asthma", label: "Asthma", description: "Inhaler and preventer renewals" },
      { href: "/conditions/acid-reflux", label: "Acid Reflux", description: "PPI and antacid prescriptions" },
      { href: "/conditions/thrush", label: "Thrush", description: "Antifungal treatment prescriptions" },
    ],
    symptoms: [
      { href: "/symptoms/runny-nose", label: "Runny Nose" },
      { href: "/symptoms/eye-strain", label: "Eye Strain" },
      { href: "/symptoms/burning-when-urinating", label: "Burning Urination" },
      { href: "/symptoms/stomach-pain", label: "Stomach Pain" },
      { href: "/symptoms/itching", label: "Itching" },
      { href: "/symptoms/shortness-of-breath", label: "Shortness of Breath" },
    ],
    guides: [
      { href: "/guides/how-to-get-repeat-prescription-online", label: "How to get a repeat prescription online" },
      { href: "/guides/escript-vs-paper-prescription", label: "eScript vs paper prescription" },
      { href: "/medical-certificate", label: "Need a medical certificate? →" },
    ],
    blog: [
      { href: "/blog/repeat-prescription-online-australia", label: "How to get a repeat prescription online" },
      { href: "/blog/telehealth-vs-gp-australia", label: "Telehealth vs GP: what's different?" },
    ],
  },
  "general-consult": {
    conditions: [
      { href: "/conditions/cold-and-flu", label: "Cold & Flu", description: "Treatment and recovery advice" },
      { href: "/conditions/uti", label: "UTI", description: "Diagnosis and treatment online" },
      { href: "/conditions/skin-rash", label: "Skin Rash", description: "Photo-based assessment available" },
      { href: "/conditions/anxiety", label: "Anxiety", description: "Support and referral pathways" },
      { href: "/conditions/ear-infection", label: "Ear Infection", description: "Symptom assessment and treatment" },
      { href: "/conditions/conjunctivitis", label: "Conjunctivitis", description: "Eye infection treatment online" },
    ],
    symptoms: [
      { href: "/symptoms/sore-throat", label: "Sore Throat" },
      { href: "/symptoms/fever", label: "Fever" },
      { href: "/symptoms/itching", label: "Itching" },
      { href: "/symptoms/fatigue", label: "Fatigue" },
      { href: "/symptoms/dizziness", label: "Dizziness" },
      { href: "/symptoms/stomach-pain", label: "Stomach Pain" },
    ],
    guides: [
      { href: "/guides/telehealth-guide-australia", label: "Telehealth guide for Australians" },
      { href: "/guides/when-to-use-telehealth", label: "When to use telehealth" },
      { href: "/medical-certificate", label: "Need a medical certificate? →" },
    ],
    blog: [
      { href: "/blog/telehealth-vs-gp-australia", label: "Telehealth vs GP: what's actually different?" },
      { href: "/blog/best-online-doctor-australia-comparison", label: "Best online doctors in Australia (2026)" },
    ],
  },
}

/**
 * Contextual cross-links section for service landing pages.
 *
 * Links to relevant conditions, symptoms, guides, and blog posts
 * based on the service type — distributing PageRank from high-authority
 * service pages to content hub pages.
 *
 * Placed before the footer but after conversion elements.
 */
export function ContentHubLinks({ service }: ContentHubLinksProps) {
  const links = SERVICE_LINKS[service]
  if (!links) return null

  return (
    <section aria-label="Related health topics" className="py-12 border-t border-border/30 dark:border-white/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-semibold text-foreground mb-8 text-center">
          Related Health Topics
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Conditions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Conditions</h3>
            </div>
            <ul className="space-y-2">
              {links.conditions.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/conditions"
                  className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  All conditions <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Symptoms */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Symptoms</h3>
            </div>
            <ul className="space-y-2">
              {links.symptoms.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/symptoms"
                  className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  All symptoms <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Guides */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Guides</h3>
            </div>
            <ul className="space-y-2">
              {links.guides.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/guides"
                  className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  All guides <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Blog */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Articles</h3>
            </div>
            <ul className="space-y-2">
              {links.blog.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  All articles <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
