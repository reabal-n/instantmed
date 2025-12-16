import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search, ArrowRight } from "lucide-react"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-hero flex items-center justify-center px-4" role="main">
      <div className="text-center max-w-lg">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1
            className="text-[150px] sm:text-[200px] font-bold text-[#0A0F1C]/5 leading-none select-none"
            style={{ fontFamily: "var(--font-display)" }}
            aria-label="Error 404"
          >
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-card rounded-2xl px-8 py-4 animate-float">
              <Search className="h-12 w-12 text-[#00E2B5]" aria-hidden="true" />
            </div>
          </div>
        </div>

        <h2
          className="text-2xl sm:text-3xl font-bold mb-4 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards", fontFamily: "var(--font-display)" }}
        >
          Page not found
        </h2>
        <p
          className="text-muted-foreground mb-8 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          Looks like this page took a sick day. Let&apos;s get you back on track.
        </p>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <Button asChild className="rounded-full btn-premium text-[#0A0F1C] w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-full w-full sm:w-auto bg-transparent">
            <Link href="/contact">
              Get Help
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <nav
          className="mt-12 pt-8 border-t border-[#0A0F1C]/5 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
          aria-label="Popular pages"
        >
          <p className="text-sm text-muted-foreground mb-4">Popular pages:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: "/medical-certificate", label: "Med Cert" },
              { href: "/prescriptions", label: "Prescriptions" },
              { href: "/faq", label: "FAQ" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full bg-[#0A0F1C]/5 text-sm font-medium hover:bg-[#00E2B5] hover:text-[#0A0F1C] transition-all focus:outline-none focus:ring-2 focus:ring-[#00E2B5] focus:ring-offset-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  )
}
