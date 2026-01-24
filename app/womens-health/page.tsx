import { redirect } from "next/navigation"

// Specialty services not yet enabled - redirect to main start page
export default function WomensHealthPage() {
  redirect("/start")
}
