import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

/**
 * GET /api/services/pricing
 * 
 * Returns live pricing from the services table.
 * Maps service slug to current price for use in the ServicePicker.
 * Cached at the edge for 5 minutes to avoid excessive DB hits.
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("services")
      .select("slug, price, type")
      .eq("active", true)
      .order("price", { ascending: true })

    if (error) {
      // Failed to fetch pricing - return empty prices gracefully
      return NextResponse.json({ prices: {} }, { status: 200 })
    }

    // Map type/slug to price for easy lookup
    const prices: Record<string, number> = {}
    for (const service of data || []) {
      // Map service type to the ServicePicker's service IDs
      if (service.type === "med_certs" || service.slug?.includes("medical-certificate")) {
        // Use the lowest price for this category
        if (!prices["med-cert"] || service.price < prices["med-cert"]) {
          prices["med-cert"] = service.price
        }
      }
      if (service.type === "common_scripts" || service.slug?.includes("prescription")) {
        if (!prices["scripts"] || service.price < prices["scripts"]) {
          prices["scripts"] = service.price
        }
      }
      if (service.type === "consult" || service.slug?.includes("consult")) {
        if (!prices["consult"] || service.price < prices["consult"]) {
          prices["consult"] = service.price
        }
      }
    }

    return NextResponse.json(
      { prices },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (_err) {
    // Pricing API error - return empty prices gracefully
    return NextResponse.json({ prices: {} }, { status: 200 })
  }
}
