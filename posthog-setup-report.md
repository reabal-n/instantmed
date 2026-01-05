# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your InstantMed Next.js project. The integration uses the recommended `instrumentation-client.ts` approach for Next.js 15.3+ with automatic pageview tracking via the `defaults: '2025-05-24'` configuration. PostHog is initialized with exception tracking enabled (`capture_exceptions: true`) and routes through a reverse proxy (`/ingest`) for improved reliability.

Key changes include:
- **Client-side tracking** via `posthog-js` for user actions like service selection, questionnaire completion, checkout initiation, payment flows, and document downloads
- **Server-side tracking** via `posthog-node` for doctor actions (request approvals/declines)
- **Error tracking integration** with the existing error-tracking module to capture exceptions in PostHog
- **User identification** is already set up via the existing `PostHogIdentify` component

## Events Integrated

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `service_selected` | User selects a service type (medical certificate, prescription, consult) at the start of the intake flow | `components/flow/steps/service-step.tsx` |
| `questionnaire_completed` | User completes all health questions in the unified questions step and proceeds to checkout | `components/flow/steps/unified-questions-step.tsx` |
| `eligibility_failed` | User fails eligibility screening (red flag triggered) and cannot proceed with the service | `app/start/unified-flow-client.tsx` |
| `checkout_initiated` | User clicks pay button to initiate Stripe checkout for a medical request | `app/medical-certificate/request/med-cert-form.tsx` |
| `payment_success` | User successfully completes payment and lands on the success page | `components/ui/success-celebration.tsx` |
| `payment_cancelled` | User abandons checkout and lands on the payment cancelled page | `app/patient/requests/cancelled/payment-cancelled-tracker.tsx` |
| `retry_payment_clicked` | User clicks retry payment button for a pending payment request | `app/patient/requests/cancelled/retry-payment-button.tsx` |
| `document_downloaded` | User downloads their approved medical document (certificate, prescription, referral) | `app/patient/requests/[id]/client.tsx` |
| `contact_form_submitted` | User submits the contact form for support or inquiries | `app/contact/page.tsx` |
| `request_approved` | Doctor approves a patient request (server-side action) | `app/doctor/requests/[id]/actions.ts` |
| `request_declined` | Doctor declines a patient request with a reason (server-side action) | `app/doctor/requests/[id]/actions.ts` |
| `error_captured` | Application error is captured and tracked for debugging | `lib/observability/error-tracking.ts` |

## Environment Variables

PostHog is configured using the following environment variables (already set in your `.env` file):

```
NEXT_PUBLIC_POSTHOG_KEY=phc_riLAgqMFu6KROAPEeOe5YYCQqv2tOLdbDZ6aqQxpOSt
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/277439/dashboard/971238) - Key business metrics dashboard with conversion funnels and user behavior tracking

### Insights
- [Service Selection Funnel](https://us.posthog.com/project/277439/insights/TaBzcfm0) - Conversion funnel from service selection through payment success
- [Payment Drop-off Analysis](https://us.posthog.com/project/277439/insights/owQkfc9k) - Track users who cancelled payment vs successful conversions
- [Service Selection by Category](https://us.posthog.com/project/277439/insights/Vh8PYaEo) - Breakdown of which services users are selecting most frequently
- [Eligibility Failure Tracking](https://us.posthog.com/project/277439/insights/YCXtiXAb) - Track users who failed eligibility screening and the reasons
- [Document Downloads & Request Approvals](https://us.posthog.com/project/277439/insights/g22eOwu5) - Track successful document downloads and doctor approval/decline rates

## Technical Notes

- PostHog client is initialized in `instrumentation-client.ts` using the recommended Next.js 15.3+ pattern
- Server-side tracking uses the `getPostHogClient()` helper from `lib/posthog-server.ts`
- User identification happens via the existing `PostHogIdentify` component in the layout
- Reverse proxy is configured in `next.config.mjs` to route PostHog requests through `/ingest`
- Exception tracking is automatically enabled via `capture_exceptions: true`
