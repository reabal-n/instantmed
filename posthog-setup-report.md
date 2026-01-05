# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into your InstantMed Next.js application. The integration includes:

- **Client-side initialization** via `instrumentation-client.ts` using the recommended Next.js 15+ approach
- **Server-side tracking** via `posthog-node` for backend events
- **Reverse proxy** configured in `next.config.mjs` to route analytics through `/ingest` for improved reliability
- **User identification** via a dedicated `PostHogIdentify` component that syncs Clerk authentication with PostHog
- **Exception capture** enabled for automatic error tracking
- **Environment variables** configured in `.env` using Next.js conventions (`NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`)

## Events Instrumented

| Event Name | Description | File |
|------------|-------------|------|
| `service_selected` | User selects a service type (medical certificate, repeat prescription, new prescription) | `components/intake/enhanced-intake-flow.tsx` |
| `intake_step_completed` | User completes a step in the multi-step intake flow | `components/intake/enhanced-intake-flow.tsx` |
| `checkout_started` | User proceeds to Stripe checkout after completing the intake flow | `components/intake/enhanced-intake-flow.tsx` |
| `checkout_error` | Checkout fails with an error | `components/intake/enhanced-intake-flow.tsx` |
| `med_cert_type_selected` | User selects certificate type (work, study, carer) in medical certificate flow | `app/medical-certificate/request/med-cert-flow-client.tsx` |
| `med_cert_duration_selected` | User selects duration for their medical certificate | `app/medical-certificate/request/med-cert-flow-client.tsx` |
| `med_cert_symptoms_entered` | User completes symptoms entry and safety confirmation | `app/medical-certificate/request/med-cert-flow-client.tsx` |
| `med_cert_checkout_initiated` | User initiates checkout for medical certificate | `app/medical-certificate/request/med-cert-flow-client.tsx` |
| `draft_recovered` | User recovers a previously saved draft form | `app/medical-certificate/request/med-cert-flow-client.tsx` |
| `request_type_selected` | User selects request type in patient portal | `app/patient/requests/new/new-request-flow.tsx` |
| `request_submitted` | User submits a health request through patient portal | `app/patient/requests/new/new-request-flow.tsx` |
| `request_submission_error` | Request submission fails with an error | `app/patient/requests/new/new-request-flow.tsx` |
| `payment_success_viewed` | User views the payment success confirmation page | `app/patient/requests/success/success-client.tsx` |

## Files Modified

| File | Changes |
|------|---------|
| `instrumentation-client.ts` | Added PostHog initialization with exception capture |
| `next.config.mjs` | Added reverse proxy rewrites for `/ingest` and CSP updates |
| `lib/posthog-server.ts` | Created server-side PostHog client |
| `components/analytics/posthog-identify.tsx` | Created user identification component |
| `app/layout.tsx` | Added PostHogIdentify component |
| `.env` | Added PostHog environment variables |
| `components/intake/enhanced-intake-flow.tsx` | Added event tracking |
| `app/medical-certificate/request/med-cert-flow-client.tsx` | Added event tracking |
| `app/patient/requests/new/new-request-flow.tsx` | Added event tracking |
| `app/patient/requests/success/success-client.tsx` | Added event tracking |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/277439/dashboard/971161) - Your main analytics dashboard

### Insights
- [Service to Payment Funnel](https://us.posthog.com/project/277439/insights/Pjx2Q2HA) - Conversion funnel from service selection to successful payment
- [Service Selection by Type](https://us.posthog.com/project/277439/insights/jfXC8q7W) - Breakdown of which services users are selecting
- [Medical Certificate Funnel](https://us.posthog.com/project/277439/insights/D4wqYBJi) - Med cert specific conversion funnel
- [Checkout Errors](https://us.posthog.com/project/277439/insights/NxKER0uF) - Track checkout errors to identify payment issues
- [Intake Flow Completion](https://us.posthog.com/project/277439/insights/dbED0nv8) - Track which steps users complete in the intake flow

## Additional Recommendations

1. **Session Replay**: PostHog session replay is now enabled. Visit the [Recordings tab](https://us.posthog.com/project/277439/replay) to watch user sessions.

2. **Feature Flags**: Consider using PostHog feature flags for A/B testing checkout flows or new features.

3. **Server-side Events**: Use the `getPostHogClient()` from `lib/posthog-server.ts` to capture server-side events (e.g., in API routes or server actions).

4. **Group Analytics**: For B2B features, consider setting up group analytics to track organization-level behavior.
