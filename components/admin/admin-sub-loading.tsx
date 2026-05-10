import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminSubLoading() {
  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Loading"
        description="Preparing the operator workspace."
      />
      <OperatorScrollArea>
      <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm shadow-primary/[0.04] dark:shadow-none space-y-3">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
