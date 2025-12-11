import { type NextRequest, NextResponse } from "next/server"
import { generateReferralCode, getReferralStats } from "@/lib/referrals/referral-service"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patientId")

  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId" }, { status: 400 })
  }

  try {
    const referralCode = await generateReferralCode(patientId)
    const stats = await getReferralStats(patientId)

    return NextResponse.json({
      referralCode,
      ...stats,
    })
  } catch (error) {
    console.error("Error fetching referral data:", error)
    return NextResponse.json({ error: "Failed to fetch referral data" }, { status: 500 })
  }
}
