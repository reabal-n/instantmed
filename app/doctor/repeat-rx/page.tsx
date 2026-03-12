import { getRepeatRxRequests } from "@/lib/data/repeat-rx"
import { RepeatRxListClient } from "./repeat-rx-list-client"

export const metadata = { title: "Repeat Prescriptions | Doctor Dashboard" }
export const dynamic = "force-dynamic"

export default async function RepeatRxPage() {
  const { requests, counts } = await getRepeatRxRequests()
  return <RepeatRxListClient initialRequests={requests} counts={counts} />
}
