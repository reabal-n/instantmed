"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  BadgeCheck,
  Stethoscope,
  Scale,
  Shield,
  Monitor,
  Clock,
  Brain,
  FlaskConical,
  ShieldAlert,
  BookOpen,
  Heart,
  FileText,
  Users,
  Building2,
  Landmark,
  type LucideIcon,
} from "lucide-react"

// =============================================================================
// ICON REGISTRY — resolves string names to components inside "use client"
// =============================================================================

const ICON_MAP: Record<string, LucideIcon> = {
  Stethoscope,
  Scale,
  Shield,
  Monitor,
  Clock,
  Brain,
  FlaskConical,
  ShieldAlert,
  BookOpen,
  Heart,
  FileText,
  Users,
  Building2,
  Landmark,
}

const DEFAULT_ICONS: LucideIcon[] = [Stethoscope, Scale, Shield, Monitor, Clock]

// =============================================================================
// TYPES
// =============================================================================

export interface GuideSectionData {
  id: string
  /** Icon name string (resolved internally) — e.g. "Stethoscope", "Shield" */
  icon?: string
  title: string
  paragraphs: string[]
}

export interface DataDrivenGuideSectionProps {
  /** Section aria-label for accessibility */
  ariaLabel: string
  /** Badge text shown above the heading */
  badge?: string
  /** Main heading */
  title: string
  /** Subtitle below the heading */
  subtitle?: string
  /** Content sections with icons, titles, and paragraphs */
  sections: GuideSectionData[]
  /** Whether to show the clinical governance footer link (default: true) */
  showGovernanceLink?: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Reusable E-E-A-T guide section — data-driven version of the Tier 2 guide sections.
 * Takes content as props instead of hardcoding, for use in dynamic template pages.
 */
export function DataDrivenGuideSection({
  ariaLabel,
  badge = "Medically reviewed by AHPRA-registered GPs",
  title,
  subtitle,
  sections,
  showGovernanceLink = true,
}: DataDrivenGuideSectionProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label={ariaLabel} className="py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={animate ? { opacity: 0, y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            {badge}
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Content sections */}
        <div className="space-y-12">
          {sections.map((section, i) => (
            <motion.div
              key={section.id}
              initial={animate ? { opacity: 0, y: 16 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  {(() => {
                    const Icon = (section.icon && ICON_MAP[section.icon]) || DEFAULT_ICONS[i % DEFAULT_ICONS.length]
                    return <Icon className="w-4.5 h-4.5 text-primary" />
                  })()}
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
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Clinical governance link */}
        {showGovernanceLink && (
          <motion.div
            className="mt-12 pt-8 border-t border-border/40 text-center"
            initial={animate ? { opacity: 0 } : {}}
            whileInView={animate ? { opacity: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs text-muted-foreground">
              All clinical decisions are made by AHPRA-registered doctors
              following{" "}
              <Link
                href="/clinical-governance"
                className="text-primary hover:underline"
              >
                our clinical governance framework
              </Link>
              . We never automate clinical decisions.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
