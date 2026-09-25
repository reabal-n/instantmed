import { GoogleAdsCert } from '@/components/marketing/google-ads-cert'
import { LegitScriptSeal } from '@/components/marketing/legitscript-seal'
import { cn } from '@/lib/utils'

/** LegitScript + Google certification marks for every landing hero (operator decision 2026-09-25). */
export function HeroCertifications({ className }: { className?: string }) {
  return (
    <div data-hero-trust-row="" role="group" aria-label="Certifications" className={cn('flex items-center gap-3', className)}>
      <LegitScriptSeal size="xs" />
      <GoogleAdsCert size="sm" className="px-0 py-0" />
    </div>
  )
}
