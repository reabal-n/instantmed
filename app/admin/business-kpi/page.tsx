import { getBusinessKPIData } from "@/lib/data/business-kpi"

import { BusinessKPIClient } from "./business-kpi-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Business KPIs" }

export default async function BusinessKPIDashboardPage() {
  const data = await getBusinessKPIData()
  return <BusinessKPIClient data={data} />
}
