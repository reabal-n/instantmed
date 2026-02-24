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
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div
          style={{
            display: "inline-block",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "#F0FDFA",
            lineHeight: "44px",
            textAlign: "center",
            fontSize: "20px",
            marginBottom: "16px",
            border: "1px solid #99F6E4",
          }}
        >
          ✓
        </div>
        <h1 style={{ marginBottom: "4px" }}>Your request has been approved</h1>
      </div>

      <p>Hi {patientName},</p>
      <p>
        Dr {doctorName} has reviewed and approved your <strong>{requestType}</strong> request.
        {documentUrl && " Your document is ready to download."}
      </p>

      {documentUrl && (
        <div style={{ textAlign: "center" }}>
          <a href={documentUrl} className="button">
            Download Your Document
          </a>
        </div>
      )}

      <div style={{ textAlign: "center" }}>
        <a href={`${APP_URL}/patient/intakes/${requestId}`} className="button button-secondary">
          View in Dashboard
        </a>
      </div>

      <div className="info-box">
        <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600, color: "#0369A1" }}>Next steps</h3>
        <ul style={{ margin: 0, fontSize: "13px" }}>
          <li>Save or print your document for your records</li>
          <li>Forward it to your employer or university if required</li>
          <li>The document includes a verification code</li>
        </ul>
      </div>

      <p style={{ fontSize: "13px", color: "#A8A29E" }}>
        Thank you for using InstantMed. We hope you feel better soon.
      </p>
    </BaseLayout>
  )
}
