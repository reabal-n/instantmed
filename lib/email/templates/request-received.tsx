import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface RequestReceivedEmailProps {
  patientName: string
  requestType: string
  requestId: string
  estimatedTime: string
}

export function RequestReceivedEmail({
  patientName,
  requestType,
  requestId,
  estimatedTime,
}: RequestReceivedEmailProps) {
  return (
    <BaseLayout previewText={`Your ${requestType} request has been received`} appUrl={APP_URL}>
      <h1>We&apos;ve received your request</h1>
      <p>Hi {patientName},</p>
      <p>
        Your <strong>{requestType}</strong> request has been submitted and is now in our review queue. A doctor will review
        your information shortly.
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>Estimated turnaround: {estimatedTime}</p>
        <p style={{ margin: "8px 0 0 0", fontSize: "13px" }}>
          Most requests are reviewed within 1 hour during operating hours (8am--10pm AEST).
        </p>
      </div>

      <p>
        <strong>Reference:</strong> {requestId.slice(0, 8).toUpperCase()}
      </p>

      <p>
        <a href={`${APP_URL}/patient/intakes/${requestId}`} className="button">
          View Request Status
        </a>
      </p>

      <p style={{ fontSize: "13px", color: "#9CA3AF" }}>
        We&apos;ll email you as soon as your request has been reviewed. You can also check your status anytime
        from your dashboard.
      </p>
    </BaseLayout>
  )
}
