import Link from 'next/link'
import { FileText, Scale, User, Pill } from 'lucide-react'
import { cn } from '@/lib/utils'
import { serviceCategories } from '@/lib/marketing/homepage'

const iconMap = {
  FileText,
  Scale,
  User,
  Pill,
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-50 hover:bg-emerald-100/80',
    border: 'border-emerald-200/60 hover:border-emerald-300',
    icon: 'text-emerald-600 bg-emerald-100',
    text: 'text-emerald-700',
  },
  violet: {
    bg: 'bg-violet-50 hover:bg-violet-100/80',
    border: 'border-violet-200/60 hover:border-violet-300',
    icon: 'text-violet-600 bg-violet-100',
    text: 'text-violet-700',
  },
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100/80',
    border: 'border-blue-200/60 hover:border-blue-300',
    icon: 'text-blue-600 bg-blue-100',
    text: 'text-blue-700',
  },
  amber: {
    bg: 'bg-amber-50 hover:bg-amber-100/80',
    border: 'border-amber-200/60 hover:border-amber-300',
    icon: 'text-amber-600 bg-amber-100',
    text: 'text-amber-700',
  },
}

export function ServicePicker() {
  return (
    <section className="relative py-12 lg:py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            What do you need today?
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Select a service to get started. Most requests are reviewed within an hour.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {serviceCategories.map((service) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap]
            const colors = colorMap[service.color as keyof typeof colorMap]
            
            return (
              <Link
                key={service.id}
                href={`/start?service=${service.slug}`}
                className={cn(
                  "group relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-200",
                  colors.bg,
                  colors.border,
                  "hover:shadow-lg hover:-translate-y-0.5"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                  colors.icon
                )}>
                  <Icon className="h-7 w-7" />
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {service.title}
                </h3>
                
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  {service.description}
                </p>
                
                <span className={cn(
                  "text-sm font-medium",
                  colors.text
                )}>
                  From ${service.priceFrom.toFixed(2)}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
