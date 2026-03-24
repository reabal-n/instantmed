import { MorningSkyBackground } from "@/components/ui/morning/morning-sky-background"
import { FloatingHelpButton } from "@/components/shared/floating-help-button"

interface MarketingPageShellProps {
  children: React.ReactNode
}

export function MarketingPageShell({ children }: MarketingPageShellProps) {
  return (
    <div data-marketing="">
      <MorningSkyBackground />
      {children}
      <FloatingHelpButton />
    </div>
  )
}
