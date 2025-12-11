import Link from "next/link"
import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Offline | InstantMed",
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">You're offline</h1>
        <p className="text-muted-foreground mb-6">
          It looks like you've lost your internet connection. InstantMed requires an internet connection to work.
        </p>
        <Button asChild className="rounded-full">
          <Link href="/">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Link>
        </Button>
      </div>
    </div>
  )
}
