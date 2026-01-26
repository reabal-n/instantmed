import { requireRole } from "@/lib/auth"
import { getReconciliationRecords, getDistinctCategories } from "@/lib/data/reconciliation"
import { ReconciliationClient } from "./reconciliation-client"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    mismatch_only?: string
    category?: string
  }>
}

export default async function ReconciliationPage({ searchParams }: PageProps) {
  await requireRole(["doctor", "admin"])

  const params = await searchParams

  // Default mismatch_only to true
  const mismatchOnly = params.mismatch_only !== "false"
  const category = params.category || undefined

  const [result, categories] = await Promise.all([
    getReconciliationRecords({
      mismatch_only: mismatchOnly,
      category,
    }),
    getDistinctCategories(),
  ])

  return (
    <ReconciliationClient
      initialData={result.data}
      summary={result.summary}
      categories={categories}
      mismatchOnly={mismatchOnly}
      selectedCategory={category}
      error={result.error}
    />
  )
}
