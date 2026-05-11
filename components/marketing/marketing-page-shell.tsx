import { MorningSkyBackground } from "@/components/ui/morning/morning-sky-background"

interface MarketingPageShellProps {
  children: React.ReactNode
}

export function MarketingPageShell({ children }: MarketingPageShellProps) {
  return (
    <div data-marketing="">
      <MorningSkyBackground />
      {children}
    </div>
  )
}
