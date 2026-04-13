import { ArrowRight, BookOpen, FileText, Search } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function ConditionNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Search className="h-7 w-7 text-primary" />
      </div>

      <h1 className="text-2xl font-semibold text-foreground mb-2">Condition not found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        We don&apos;t have a page for this condition yet. Browse our conditions directory or start a request.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="rounded-xl">
          <Link href="/conditions">
            <BookOpen className="mr-2 h-4 w-4" />
            Browse conditions
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href="/request?service=med-cert">
            <FileText className="mr-2 h-4 w-4" />
            Get a med cert
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
