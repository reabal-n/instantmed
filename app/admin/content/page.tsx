import { ContentBlocksClient } from "./content-client"
import { getAllContentBlocksAction } from "@/app/actions/admin-config"

export const dynamic = "force-dynamic"

export default async function ContentBlocksPage() {
  const blocks = await getAllContentBlocksAction().catch(() => [])

  return <ContentBlocksClient initialBlocks={blocks} />
}
