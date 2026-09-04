import { redirect } from "next/navigation"

import { REQUEST_CONFIRMED_HREF } from "@/lib/dashboard/routes"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "No Account Needed",
  description: "You can continue without creating an account",
}

export default function ConfirmedPage() {
  redirect(REQUEST_CONFIRMED_HREF)
}
