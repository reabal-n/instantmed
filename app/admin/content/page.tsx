import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { ContentBlocksClient } from "./content-client"
import { getAllContentBlocksAction } from "@/app/actions/admin-config"

export const dynamic = "force-dynamic"

export default async function ContentBlocksPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const blocks = await getAllContentBlocksAction()

  return <ContentBlocksClient initialBlocks={blocks} />
}
