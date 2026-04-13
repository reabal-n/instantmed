import { getAllContentBlocksAction } from "@/app/actions/admin-config"

import { ContentBlocksClient } from "./content-client"

export const dynamic = "force-dynamic"

export default async function ContentBlocksPage() {
  const blocks = await getAllContentBlocksAction().catch(() => [])

  return <ContentBlocksClient initialBlocks={blocks} />
}
