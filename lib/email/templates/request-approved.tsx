import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface RequestApprovedEmailProps {
  patientName: string
  requestType: string
  requestId: string
  documentUrl?: string
  doctorName: string
}

export function RequestApprovedEmail({
  patientName,
  requestType,
  requestId,
  documentUrl,
  doctorName,
}: RequestApprovedEmailProps) {
  return (
    <BaseLayout previewText={`Your ${requestType} has been approved`} appUrl={APP_URL}>
      <h1>Good news! Your request is approved ✓</h1>
      <p>Hi {patientName},</p>
      <p>
        Dr {doctorName} has reviewed and approved your <strong>{requestType}</strong> request.
        {documentUrl && " Your document is ready to download."}
      </p>

      {documentUrl && (
        <p>
          <a href={documentUrl} className="button">
            Download Your Document
          </a>
        </p>
      )}

      <p>
        <a href={`${APP_URL}/patient/intakes/${requestId}`} className="button button-secondary">
          View in Dashboard
        </a>
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontSize: "14px" }}>
          <strong>Tips:</strong>
        </p>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", fontSize: "14px" }}>
          <li>Save or print your document for your records</li>
          <li>Forward it to your employer/university if required</li>
          <li>The document includes a verification code</li>
        </ul>
      </div>

      <p style={{ fontSize: "14px", color: "#737373" }}>
        Thank you for using InstantMed. We hope you feel better soon!
      </p>
    </BaseLayout>
  )
}
