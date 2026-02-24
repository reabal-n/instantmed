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
          Most requests are reviewed within 1 hour during operating hours (8am–10pm AEST).
        </p>
      </div>

      <div style={{ background: "#F5F5F4", borderRadius: "8px", padding: "12px 20px", margin: "16px 0", border: "1px solid #E7E5E4" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#78716C" }}>
          <strong style={{ color: "#1C1917" }}>Reference:</strong>{" "}
          <span style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.5px", fontSize: "13px" }}>
            {requestId.slice(0, 8).toUpperCase()}
          </span>
        </p>
      </div>

      <div style={{ textAlign: "center" }}>
        <a href={`${APP_URL}/patient/intakes/${requestId}`} className="button">
          View Request Status
        </a>
      </div>

      <p style={{ fontSize: "13px", color: "#A8A29E" }}>
        We&apos;ll email you as soon as your request has been reviewed. You can also check your status anytime
        from your dashboard.
      </p>
    </BaseLayout>
  )
}
