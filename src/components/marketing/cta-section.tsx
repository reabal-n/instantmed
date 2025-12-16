import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
          Ready when you are 👋
        </h2>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          Get the care you need without rearranging your whole day. Takes about 3 minutes to start.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            asChild 
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-14 text-lg font-semibold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all"
          >
            <Link href="/start">
              Start in 60 seconds
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          No account required to get started. Pay only if approved.
        </p>
      </div>
    </section>
  )
}
