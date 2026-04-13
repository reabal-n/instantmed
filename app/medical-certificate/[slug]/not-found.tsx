import { ArrowRight, FileText, Search } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function MedCertSlugNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Search className="h-7 w-7 text-primary" />
      </div>

      <h1 className="text-2xl font-semibold text-foreground mb-2">Page not found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        We couldn&apos;t find this medical certificate page. You can still request a certificate.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="rounded-xl">
          <Link href="/medical-certificate">
            <FileText className="mr-2 h-4 w-4" />
            Medical certificates
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href="/request?service=med-cert">
            Get started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
