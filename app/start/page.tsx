import { EnhancedIntakeFlow } from "@/components/intake/enhanced-intake-flow"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function StartPage() {
  return <EnhancedIntakeFlow />
}
