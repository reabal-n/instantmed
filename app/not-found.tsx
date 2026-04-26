import { ArrowRight, FileText, HelpCircle, Home, Pill } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background" role="main">
      <div className="text-center max-w-lg">
        <p
          className="text-6xl sm:text-7xl font-semibold text-muted-foreground/25 tabular-nums tracking-tight mb-6 select-none"
          aria-label="Error 404"
        >
          404
        </p>

        <h1 className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground tracking-tight">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Looks like this page took a sick day. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/contact">
              Get Help
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <nav
          className="mt-12 pt-8 border-t border-border/50"
          aria-label="Popular pages"
        >
          <p className="text-sm text-muted-foreground mb-4">Quick links:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { href: "/request?service=med-cert", label: "Med Cert", icon: FileText },
              { href: "/request?service=prescription", label: "Prescriptions", icon: Pill },
              { href: "/faq", label: "FAQ", icon: HelpCircle },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-card border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-md shadow-primary/[0.04] transition-[transform,box-shadow]"
              >
                <link.icon className="h-4 w-4 text-primary/70 group-hover:text-primary" />
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  )
}
