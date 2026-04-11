import { MorningSkyBackground } from "@/components/ui/morning/morning-sky-background"

interface MarketingPageShellProps {
  children: React.ReactNode
}

export function MarketingPageShell({ children }: MarketingPageShellProps) {
  return (
    <div data-marketing="">
      <MorningSkyBackground />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      {children}
    </div>
  )
}
