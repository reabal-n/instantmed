import { ApiCheck, AssertionBuilder } from 'checkly/constructs'

// Intake flow entry point — if this 500s, patients can't start a request.
// The page itself requires JS to fully render but the server response must be 200.
new ApiCheck('intake-flow-medcert', {
  name: 'Intake Flow — Med Cert',
  activated: true,
  frequency: 5,
  locations: ['ap-southeast-2', 'ap-southeast-1'],
  request: {
    method: 'GET',
    url: 'https://instantmed.com.au/request?service=med-cert',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(5000),
    ],
  },
})

// Stripe webhook endpoint — must accept POST (returns 400 without valid payload,
// but a 404/405 would mean the route is down).
new ApiCheck('stripe-webhook-reachable', {
  name: 'Stripe Webhook Route Reachable',
  activated: true,
  frequency: 10,
  locations: ['ap-southeast-2'],
  request: {
    method: 'POST',
    url: 'https://instantmed.com.au/api/stripe/webhook',
    body: '{}',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    // 400 = route exists, rejected bad signature. 404/405 = route is broken.
    assertions: [
      AssertionBuilder.statusCode().notEquals(404),
      AssertionBuilder.statusCode().notEquals(405),
    ],
  },
})
