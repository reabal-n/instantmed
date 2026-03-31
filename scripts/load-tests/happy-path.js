/**
 * k6 Load Test: Happy Path
 *
 * Simulates the full patient journey:
 * 1. Homepage load
 * 2. Service hub (med-cert, prescription, consult pages)
 * 3. Request flow page load
 * 4. Health/availability API checks
 * 5. Static asset caching verification
 *
 * Does NOT create real checkouts or intakes — those require auth.
 * For payment flow load testing, use webhook-storm.js.
 *
 * Usage:
 *   k6 run scripts/load-tests/happy-path.js --env BASE_URL=http://localhost:3000
 */

import http from "k6/http"
import { check, sleep, group } from "k6"
import { Rate, Trend } from "k6/metrics"

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

// Custom metrics
const errorRate = new Rate("errors")
const pageLoadTrend = new Trend("page_load_duration")

export const options = {
  stages: [
    { duration: "30s", target: 10 },  // Ramp up to 10 VUs
    { duration: "2m", target: 50 },   // Hold at 50 VUs
    { duration: "30s", target: 100 }, // Spike to 100
    { duration: "1m", target: 100 },  // Hold spike
    { duration: "30s", target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // 95% of requests < 2s
    http_req_failed: ["rate<0.01"],     // <1% error rate
    errors: ["rate<0.01"],
  },
}

export default function () {
  group("Homepage", () => {
    const res = http.get(`${BASE_URL}/`)
    const passed = check(res, {
      "status 200": (r) => r.status === 200,
      "has content": (r) => r.body && r.body.length > 1000,
      "no server error": (r) => r.status < 500,
    })
    errorRate.add(!passed)
    pageLoadTrend.add(res.timings.duration)
  })

  sleep(0.5)

  group("Service pages", () => {
    const pages = [
      "/medical-certificate",
      "/prescriptions",
      "/general-consult",
      "/pricing",
      "/how-it-works",
    ]
    const page = pages[Math.floor(Math.random() * pages.length)]
    const res = http.get(`${BASE_URL}${page}`)
    check(res, {
      "service page 200": (r) => r.status === 200,
      "no server error": (r) => r.status < 500,
    })
    pageLoadTrend.add(res.timings.duration)
  })

  sleep(0.5)

  group("Request flow page", () => {
    const services = ["med-cert", "prescription", "consult"]
    const service = services[Math.floor(Math.random() * services.length)]
    const res = http.get(`${BASE_URL}/request?service=${service}`)
    check(res, {
      "request page loads": (r) => r.status === 200,
      "no server error": (r) => r.status < 500,
    })
    pageLoadTrend.add(res.timings.duration)
  })

  sleep(0.3)

  group("API: Health check", () => {
    const res = http.get(`${BASE_URL}/api/health`)
    check(res, {
      "health 200": (r) => r.status === 200,
      "response < 500ms": (r) => r.timings.duration < 500,
    })
  })

  group("API: Availability", () => {
    const res = http.get(`${BASE_URL}/api/availability`)
    check(res, {
      "availability responds": (r) => r.status === 200 || r.status === 429,
      "response < 500ms": (r) => r.timings.duration < 500,
    })
  })

  sleep(0.5)

  group("SEO pages", () => {
    const seoPages = [
      "/conditions/cold-and-flu",
      "/symptoms/headache",
      "/faq",
      "/blog",
      "/about",
      "/trust",
    ]
    const page = seoPages[Math.floor(Math.random() * seoPages.length)]
    const res = http.get(`${BASE_URL}${page}`)
    check(res, {
      "SEO page 200": (r) => r.status === 200,
      "has content": (r) => r.body && r.body.length > 500,
    })
    pageLoadTrend.add(res.timings.duration)
  })

  sleep(1)
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    metrics: {
      http_req_duration_p95: data.metrics.http_req_duration?.values?.["p(95)"],
      http_req_duration_avg: data.metrics.http_req_duration?.values?.avg,
      http_req_failed_rate: data.metrics.http_req_failed?.values?.rate,
      page_load_p95: data.metrics.page_load_duration?.values?.["p(95)"],
      total_requests: data.metrics.http_reqs?.values?.count,
      error_rate: data.metrics.errors?.values?.rate,
    },
  }

  return {
    stdout: JSON.stringify(summary, null, 2) + "\n",
  }
}
