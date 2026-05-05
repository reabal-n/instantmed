import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export const metadata = {
  title: { absolute: "Redirecting | InstantMed" },
}

export default function LegacyDoctorEmailSuppressionPage() {
  redirect("/admin/emails/suppression")
}
