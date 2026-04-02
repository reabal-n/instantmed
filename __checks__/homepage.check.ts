import { ApiCheck, AssertionBuilder } from 'checkly/constructs'

// Homepage — primary SEO/conversion entry point.
// Checks that the page loads and doesn't redirect unexpectedly.
new ApiCheck('homepage', {
  name: 'Homepage',
  activated: true,
  frequency: 5,
  locations: ['ap-southeast-2', 'ap-southeast-1'],
  request: {
    method: 'GET',
    url: 'https://instantmed.com.au/',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(5000),
    ],
  },
})

// Medical certificate page — highest commercial intent, most important SEO page.
new ApiCheck('medical-certificate-page', {
  name: 'Medical Certificate Page',
  activated: true,
  frequency: 5,
  locations: ['ap-southeast-2', 'ap-southeast-1'],
  request: {
    method: 'GET',
    url: 'https://instantmed.com.au/medical-certificate',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(5000),
    ],
  },
})
