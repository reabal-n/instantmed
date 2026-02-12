import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface RequestDeclinedEmailProps {
  patientName: string
  requestType: string
  requestId: string
  reason: string
}

export function RequestDeclinedEmail({ patientName, requestType, requestId, reason }: RequestDeclinedEmailProps) {
  return (
    <BaseLayout previewText={`Update on your ${requestType} request`} appUrl={APP_URL}>
      <h1>About your request</h1>
      <p>Hi {patientName},</p>
      <p>
        After careful review, the doctor was unable to approve your <strong>{requestType}</strong>{" "}
        request at this time.
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>Reason:</p>
        <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>{reason}</p>
      </div>

      <p><strong>What happens next?</strong></p>
      <p>A full refund will be processed to your original payment method within 5--7 business days.</p>

      <div className="warning-box">
        <p style={{ margin: 0, fontSize: "14px" }}>
          <strong>Need to see a doctor?</strong>
          <br />
          If your symptoms are concerning, please consider booking an in-person appointment with your regular GP or
          visiting a medical centre.
        </p>
      </div>

      <p>
        <a href={`${APP_URL}/patient/intakes/${requestId}`} className="button button-secondary">
          View Details
        </a>
      </p>

      <p style={{ fontSize: "13px", color: "#9CA3AF" }}>
        If you have questions about this decision, reply to this email.
      </p>
    </BaseLayout>
  )
}
