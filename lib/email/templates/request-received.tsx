import { BaseLayout } from "./base-layout"

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
    <BaseLayout previewText={`Your ${requestType} request has been received`}>
      <h1>We&apos;ve received your request</h1>
      <p>Hi {patientName},</p>
      <p>
        Your <strong>{requestType}</strong> request has been submitted and is now in our review queue. A GP will review
        your information shortly.
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontWeight: 500 }}>Estimated turnaround: {estimatedTime}</p>
        <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>
          Most requests are reviewed within 1 hour during operating hours (8am–10pm AEST).
        </p>
      </div>

      <p>
        <strong>Reference:</strong> {requestId.slice(0, 8).toUpperCase()}
      </p>

      <p>
        <a href={`https://instantmed.com.au/patient/requests/${requestId}`} className="button">
          View Request Status
        </a>
      </p>

      <p style={{ fontSize: "14px", color: "#737373" }}>
        We&apos;ll email you as soon as your request has been reviewed. You can also check your request status anytime
        in your dashboard.
      </p>
    </BaseLayout>
  )
}
