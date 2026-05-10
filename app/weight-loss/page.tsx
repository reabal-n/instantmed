import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: { absolute: "Available Services | InstantMed" },
  description:
    "View the InstantMed services currently available online.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Available Services | InstantMed",
    description: "View the InstantMed services currently available online.",
    url: "https://instantmed.com.au/request",
  },
  twitter: {
    card: "summary_large_image",
    title: "Available Services | InstantMed",
    description: "View the InstantMed services currently available online.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/request",
  },
}

export default function WeightLossPage() {
  redirect("/request")
}
