import { Shield } from 'lucide-react'

import { StickerIcon } from '@/components/icons/stickers'
import { Heading } from '@/components/ui/heading'
import { cn } from '@/lib/utils'

import type { ColorClasses,ServiceFunnelConfig } from './funnel-types'
import { iconMap, STICKER_ICON_MAP } from './funnel-types'

interface TrustSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
}

export function TrustSection({ config, colors }: TrustSectionProps) {
  return (
    <section className="py-16 lg:py-24 bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Heading level="h2" className="mb-4">
            {config.trust.title}
          </Heading>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {config.trust.badges.map((badge, i) => {
            const Icon = iconMap[badge.icon] || Shield
            const stickerName = STICKER_ICON_MAP[badge.icon]
            return (
              <div
                key={i}
                className="text-center p-6 bg-white dark:bg-card rounded-xl border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08] transition-[transform,box-shadow] duration-300"
              >
                {stickerName ? (
                  <div className="flex items-center justify-center mx-auto mb-4">
                    <StickerIcon name={stickerName} size={48} />
                  </div>
                ) : (
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4', colors.light)}>
                    <Icon className={cn('w-6 h-6', colors.text)} />
                  </div>
                )}
                <h3 className="font-semibold text-foreground mb-1">{badge.title}</h3>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
