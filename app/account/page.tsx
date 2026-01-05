import { AccountClient } from "./account-client"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function AccountPage() {
  return <AccountClient />
}
