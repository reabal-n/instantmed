import { getAllContentBlocksAction } from "@/app/actions/admin-config"
import { requireRole } from "@/lib/auth/helpers"

import { ContentBlocksClient } from "./content-client"

export const dynamic = "force-dynamic"

export default async function ContentBlocksPage() {
  await requireRole(["admin"], { redirectTo: "/admin" })

  const blocks = await getAllContentBlocksAction().catch(() => [])

  return <ContentBlocksClient initialBlocks={blocks} />
}
