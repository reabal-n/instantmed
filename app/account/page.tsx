import { AccountClient } from "./account-client"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default function AccountPage() {
  return <AccountClient />
}
