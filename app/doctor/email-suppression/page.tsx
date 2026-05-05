import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export const metadata = {
  title: { absolute: "Email Suppression | InstantMed" },
}

export default function LegacyDoctorEmailSuppressionPage() {
  redirect("/admin/emails/suppression")
}
