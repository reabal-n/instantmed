import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowRight, FileText, Pill, HelpCircle, Zap } from "lucide-react"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden" role="main">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      
      <div className="relative z-10 text-center max-w-lg">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1
            className="text-[120px] sm:text-[180px] font-bold leading-none select-none bg-clip-text text-transparent bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/5"
            aria-label="Error 404"
          >
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="bg-card/80 backdrop-blur-md rounded-3xl px-8 py-6 border border-border/50 shadow-2xl shadow-primary/5 animate-bounce"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                <Zap className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <h2
          className="text-2xl sm:text-3xl font-bold mb-4 text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Page not found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Looks like this page took a sick day. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="rounded-xl w-full sm:w-auto shadow-lg shadow-primary/25">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl w-full sm:w-auto">
            <Link href="/contact">
              Get Help
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <nav
          className="mt-12 pt-8 border-t border-border/50"
          aria-label="Popular pages"
        >
          <p className="text-sm text-muted-foreground mb-4">Quick links:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { href: "/start?service=med-cert", label: "Med Cert", icon: FileText },
              { href: "/prescriptions/request", label: "Prescriptions", icon: Pill },
              { href: "/faq", label: "FAQ", icon: HelpCircle },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-md transition-all"
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
