import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface NeedsMoreInfoEmailProps {
  patientName: string
  requestType: string
  requestId: string
  doctorMessage: string
}

export function NeedsMoreInfoEmail({ patientName, requestType, requestId, doctorMessage }: NeedsMoreInfoEmailProps) {
  return (
    <BaseLayout previewText="Action needed: Additional information required" appUrl={APP_URL}>
      <h1>We need a bit more information</h1>
      <p>Hi {patientName},</p>
      <p>
        The doctor reviewing your <strong>{requestType}</strong> request needs some additional information before they
        can proceed.
      </p>

      <div className="warning-box">
        <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "#92400e" }}>Message from the doctor:</p>
        <p style={{ margin: "10px 0 0 0", fontSize: "14px", color: "#78350f", lineHeight: 1.6 }}>{doctorMessage}</p>
      </div>

      <p>
        <a href={`${APP_URL}/patient/intakes/${requestId}`} className="button">
          Respond Now
        </a>
      </p>

      <p style={{ fontSize: "13px", color: "#6b7280" }}>
        Please respond as soon as possible so we can continue processing your request. Your spot in the queue is saved.
      </p>
    </BaseLayout>
  )
}
