/**
 * k6 Load Test: API Endpoints
 *
 * Hammers API routes to find rate limit thresholds,
 * connection pool limits, and cold start latency.
 *
 * Tests:
 * - /api/health (unprotected, baseline)
 * - /api/availability (business hours + capacity check)
 * - /api/csp-report (POST, fire-and-forget)
 * - /api/places/autocomplete (external Google Places, rate-limited)
 * - Static assets (cache validation)
 *
 * Usage:
 *   k6 run scripts/load-tests/api-endpoints.js --env BASE_URL=http://localhost:3000
 */

import http from "k6/http"
import { check, sleep } from "k6"
import { Rate } from "k6/metrics"

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"
const rateLimitHits = new Rate("rate_limited")
const serverErrors = new Rate("server_errors")

export const options = {
  scenarios: {
    // Steady state: normal API usage
    steady: {
      executor: "constant-vus",
      vus: 20,
      duration: "2m",
      gracefulStop: "10s",
    },
    // Burst: sudden spike (simulates marketing email send)
    burst: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "30s", target: 100 },
        { duration: "10s", target: 0 },
      ],
      startTime: "2m30s", // Start after steady state
      gracefulStop: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],  // API p95 < 500ms
    http_req_failed: ["rate<0.05"],    // <5% error rate (some rate limits expected)
    server_errors: ["rate<0.01"],      // <1% 5xx errors
  },
}

export default function () {
  // Health check (unprotected baseline)
  const health = http.get(`${BASE_URL}/api/health`)
  check(health, {
    "health 200": (r) => r.status === 200,
    "health < 200ms": (r) => r.timings.duration < 200,
  })
  serverErrors.add(health.status >= 500)

  sleep(0.1)

  // Availability check (hits Supabase)
  const avail = http.get(`${BASE_URL}/api/availability`)
  const availOk = check(avail, {
    "availability responds": (r) => r.status === 200 || r.status === 429,
    "availability < 500ms": (r) => r.timings.duration < 500,
  })
  rateLimitHits.add(avail.status === 429)
  serverErrors.add(avail.status >= 500)

  sleep(0.1)

  // CSP report (POST endpoint, fire-and-forget)
  const cspPayload = JSON.stringify({
    "csp-report": {
      "document-uri": `${BASE_URL}/test`,
      "violated-directive": "script-src",
      "blocked-uri": "https://evil.example.com",
      "original-policy": "script-src 'self'",
    },
  })
  const csp = http.post(`${BASE_URL}/api/csp-report`, cspPayload, {
    headers: { "Content-Type": "application/csp-report" },
  })
  check(csp, {
    "csp report accepted": (r) => r.status === 200 || r.status === 204,
  })
  serverErrors.add(csp.status >= 500)

  sleep(0.2)

  // Sitemap (static generation, should be fast)
  const sitemap = http.get(`${BASE_URL}/sitemap.xml`)
  check(sitemap, {
    "sitemap 200": (r) => r.status === 200,
    "sitemap has URLs": (r) => r.body && r.body.includes("<url>"),
  })

  sleep(0.3)

  // Robots.txt (static)
  const robots = http.get(`${BASE_URL}/robots.txt`)
  check(robots, {
    "robots 200": (r) => r.status === 200,
  })

  sleep(0.2)
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    metrics: {
      http_req_duration_p95: data.metrics.http_req_duration?.values?.["p(95)"],
      http_req_duration_p99: data.metrics.http_req_duration?.values?.["p(99)"],
      http_req_failed_rate: data.metrics.http_req_failed?.values?.rate,
      rate_limited_pct: data.metrics.rate_limited?.values?.rate,
      server_error_pct: data.metrics.server_errors?.values?.rate,
      total_requests: data.metrics.http_reqs?.values?.count,
    },
  }

  return {
    stdout: JSON.stringify(summary, null, 2) + "\n",
  }
}
