import Link from 'next/link'
import { BrandLogo } from '@/components/shared/brand-logo'
import { siteConfig, footerLinks } from '@/lib/marketing/homepage'

const TapeDecoration = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="95" height="80" viewBox="0 0 95 80" fill="none" className="w-20 h-auto">
    <path d="M1 45L70.282 5L88.282 36.1769L19 76.1769L1 45Z" fill="currentColor" className="text-zinc-200 dark:text-zinc-700"/>
    <path d="M69.6829 39.997C74.772 36.9233 80.2799 35.022 85.4464 32.0415C85.5584 31.9769 85.6703 31.912 85.782 31.8468L83.9519 38.6769C80.2833 32.3886 75.7064 26.4975 72.2275 20.0846C70.0007 15.9783 67.7966 11.8425 65.6183 7.69261L72.9746 9.66373C70.566 10.9281 68.1526 12.1837 65.7375 13.4301C59.1543 16.828 52.5477 20.1634 45.9059 23.4675C39.2779 26.7637 32.6138 30.0293 25.946 33.2683C21.417 35.4683 16.8774 37.6611 12.3408 39.8468C10.3494 40.8065 8.36335 41.7623 6.37228 42.7203C4.88674 43.4348 3.40117 44.1492 1.91563 44.8637C1.70897 44.9628 1.48389 45.0108 1.28779 44.994C1.0916 44.977 0.940536 44.8975 0.866099 44.7681C0.791689 44.6386 0.798739 44.4674 0.882816 44.289C0.966978 44.111 1.12195 43.9408 1.31146 43.8119C2.68692 42.8791 4.06239 41.9462 5.43785 41.0134C6.96571 39.9774 8.49068 38.9427 10.0185 37.9078C10.5758 38.2934 11.1526 38.4968 11.9006 38.3019C12.2823 38.2024 12.7844 37.9628 13.0812 37.66C13.3477 37.388 13.4958 37.092 13.6361 36.8103C13.7828 36.5157 13.922 36.236 14.1819 36.0157C14.6227 35.6416 14.9608 35.1461 15.3159 34.6256C15.4451 34.4362 15.5766 34.2432 15.7162 34.0517C17.1755 33.0653 18.6355 32.0797 20.0958 31.0952L69.6829 39.997Z" fill="currentColor" className="text-zinc-200 dark:text-zinc-700"/>
  </svg>
)

export function MarketingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="my-8 px-4 max-w-5xl mx-auto">
      {/* Main card with tape decorations */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl max-w-5xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between items-center gap-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        {/* Tape decorations */}
        <div className="hidden md:block absolute -top-4 -left-8 scale-75 -rotate-12">
          <TapeDecoration />
        </div>
        <div className="hidden md:block absolute -top-4 -right-8 rotate-[78deg] scale-75">
          <TapeDecoration />
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-10 px-2 md:px-8 flex-1 w-full">
          {/* Brand section */}
          <div className="flex flex-col items-start gap-2">
            <BrandLogo size="md" />
            <p className="text-muted-foreground font-medium text-sm w-full md:w-4/5">
              Medical certificates & consultations — handled online by real Australian doctors.
            </p>
          </div>

          <div className="flex flex-col md:mx-4 md:flex-row gap-6 md:gap-16 items-start md:items-start">
            {/* Services column */}
            <nav className="flex flex-col gap-1 md:gap-4">
              <h4 className="uppercase text-xs text-muted-foreground font-semibold tracking-wide">Services</h4>
              <div className="flex flex-wrap md:flex-col gap-2 text-sm items-start">
                {footerLinks.services.map((link) => (
                  <Link 
                    key={link.href}
                    className="text-muted-foreground hover:text-foreground whitespace-nowrap font-medium transition-colors" 
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link className="text-muted-foreground hover:text-foreground whitespace-nowrap font-medium transition-colors" href="/start?service=consult">
                  General Consult
                </Link>
              </div>
            </nav>

            {/* Company column */}
            <nav className="flex flex-col gap-1 md:gap-4">
              <h4 className="uppercase whitespace-nowrap text-xs text-muted-foreground font-semibold tracking-wide">Company</h4>
              <div className="flex gap-2 flex-wrap md:flex-col text-sm items-start">
                {footerLinks.company.map((link) => (
                  <Link 
                    key={link.href}
                    className="text-muted-foreground hover:text-foreground whitespace-nowrap font-medium transition-colors" 
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Legal column */}
            <nav className="hidden md:flex flex-col gap-1 md:gap-4">
              <h4 className="uppercase whitespace-nowrap text-xs text-muted-foreground font-semibold tracking-wide">Legal</h4>
              <div className="flex flex-col gap-2 text-sm items-start">
                {footerLinks.legal.map((link) => (
                  <Link 
                    key={link.href}
                    className="text-muted-foreground hover:text-foreground whitespace-nowrap font-medium transition-colors" 
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="my-4 px-4 md:px-8 text-xs text-muted-foreground/70 space-y-2">
        <p>
          <strong className="text-muted-foreground">Important:</strong> Online assessment is not suitable for medical emergencies. 
          If you are experiencing a medical emergency, call <strong className="text-foreground">000</strong> immediately.
        </p>
      </div>

      {/* Bottom bar */}
      <div className="px-4 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 items-start sm:items-center">
          <p className="whitespace-nowrap text-xs">
            © {currentYear} {siteConfig.legal.clinicName}. All rights reserved.
          </p>
          <div className="flex flex-row gap-4 text-xs">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70">
          AHPRA-registered Australian doctors
        </p>
      </div>
    </footer>
  )
}
