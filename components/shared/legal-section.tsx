import type React from "react"

interface LegalSectionProps {
  number: string
  title: string
  id?: string
  children: React.ReactNode
}

export function LegalSection({ number, title, id, children }: LegalSectionProps) {
  return (
    <section id={id || `section-${number}`} className="pt-8 first:pt-0">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {number}. {title}
      </h2>
      <div className="text-sm text-muted-foreground space-y-3 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80">
        {children}
      </div>
    </section>
  )
}
