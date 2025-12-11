import { createClient } from "@/lib/supabase/server"
import { ServiceSelector } from "./service-selector"

export const metadata = {
  title: "Get Started | InstantMed",
  description: "Select the service you need from InstantMed",
}

export default async function StartPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <ServiceSelector isAuthenticated={!!user} />
}
