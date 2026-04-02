import { ApiCheck, AssertionBuilder } from 'checkly/constructs'

// Health endpoint — first line of defence.
// Must return 200 with status not "degraded" before any other checks matter.
new ApiCheck('api-health', {
  name: 'Health API',
  activated: true,
  frequency: 1,
  locations: ['ap-southeast-2', 'ap-southeast-1'],
  request: {
    method: 'GET',
    url: 'https://instantmed.com.au/api/health',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      // Degraded = DB/Redis/Stripe partially down — still alerts
      AssertionBuilder.jsonBody('$.status').notEquals('degraded'),
    ],
  },
})
