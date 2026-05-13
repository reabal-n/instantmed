const baseUrl = process.env.E2E_BASE_URL || process.env.BASE_URL || "https://instantmed.com.au"
const dashboardUrl = new URL("/dashboard", baseUrl)

const GLOBAL_ERROR_PATTERNS = [
  "Something went wrong",
  "Please try again. If this keeps happening",
  "reference:",
]

function fail(message) {
  console.error(`[dashboard-smoke] ${message}`)
  process.exit(1)
}

let response
try {
  response = await fetch(dashboardUrl, {
    redirect: "manual",
    headers: {
      "user-agent": "InstantMed-dashboard-smoke/1.0",
    },
    signal: AbortSignal.timeout(15_000),
  })
} catch (error) {
  fail(`request failed for ${dashboardUrl.toString()}: ${error instanceof Error ? error.message : String(error)}`)
}

const location = response.headers.get("location") || ""
const body = await response.text().catch(() => "")
const redirectsToSignIn = response.status >= 300 && response.status < 400 && location.includes("/sign-in")
const rendersSignInRedirect =
  response.status === 200 &&
  (body.includes("/sign-in") || (body.includes("NEXT_REDIRECT") && body.includes("sign-in")))

if (!redirectsToSignIn && !rendersSignInRedirect) {
  fail(`expected unauthenticated /dashboard to redirect to sign-in; got ${response.status} ${location || ""}`.trim())
}

const globalError = GLOBAL_ERROR_PATTERNS.find((pattern) => body.includes(pattern))
if (globalError) {
  fail(`dashboard returned global error text: ${globalError}`)
}

console.log(`[dashboard-smoke] ok: ${dashboardUrl.toString()} redirects unauthenticated users without global error text`)
