import { type NextRequest, NextResponse } from "next/server"

const serviceMap: Record<string, string> = {
  "med-cert": "med-cert",
  "medical-certificate": "med-cert",
  medcert: "med-cert",
  "repeat-script": "prescription",
  "repeat-rx": "prescription",
  prescription: "prescription",
  prescriptions: "prescription",
  "new-script": "consult",
  "new-prescription": "consult",
  consult: "consult",
  consultation: "consult",
}

export function GET(request: NextRequest) {
  const targetUrl = new URL("/request", request.url)
  const legacyService = request.nextUrl.searchParams.get("service")
  const mappedService = legacyService ? serviceMap[legacyService.toLowerCase()] : undefined

  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "service") targetUrl.searchParams.append(key, value)
  })

  if (mappedService) {
    targetUrl.searchParams.set("service", mappedService)
  }

  return NextResponse.redirect(targetUrl, 307)
}
