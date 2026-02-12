import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface PaymentConfirmedEmailProps {
  patientName: string
  requestType: string
  amount: string
  requestId: string
}

export function PaymentConfirmedEmail({ patientName, requestType, amount, requestId }: PaymentConfirmedEmailProps) {
  return (
    <BaseLayout previewText={`Payment confirmed for your ${requestType}`} appUrl={APP_URL}>
      <h1>Payment confirmed</h1>
      <p>Hi {patientName},</p>
      <p>
        We&apos;ve received your payment of <strong>{amount}</strong> for your {requestType} request.
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontSize: "14px" }}>Your request is now in the review queue. A doctor will review it shortly.</p>
      </div>

      <table style={{ width: "100%", fontSize: "14px", marginBottom: "20px" }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px 0", color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>Reference</td>
            <td style={{ padding: "8px 0", fontWeight: 600, textAlign: "right", borderBottom: "1px solid #f3f4f6", fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.5px" }}>
              {requestId.slice(0, 8).toUpperCase()}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#6b7280" }}>Amount</td>
            <td style={{ padding: "8px 0", fontWeight: 600, textAlign: "right" }}>{amount}</td>
          </tr>
        </tbody>
      </table>

      <p>
        <a href={`${APP_URL}/patient/intakes/${requestId}`} className="button">
          Track Your Request
        </a>
      </p>

      <p style={{ fontSize: "13px", color: "#6b7280" }}>
        A receipt has been sent to your email. If you need an invoice for tax purposes, you can download it from your
        dashboard.
      </p>
    </BaseLayout>
  )
}
