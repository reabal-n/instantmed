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
    <BaseLayout previewText={`Payment confirmed — ${amount} for your ${requestType}`} appUrl={APP_URL}>
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
        <h1 style={{ marginBottom: "4px" }}>Payment confirmed</h1>
        <p style={{ color: "#78716C", fontSize: "14px", margin: 0 }}>
          Your request is now in the review queue
        </p>
      </div>

      <p>Hi {patientName},</p>
      <p>
        We&apos;ve received your payment of <strong>{amount}</strong> for your {requestType} request.
        A doctor will review it shortly.
      </p>

      <div style={{ background: "#F5F5F4", borderRadius: "8px", padding: "16px 20px", margin: "20px 0", border: "1px solid #E7E5E4" }}>
        <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", color: "#78716C", borderBottom: "1px solid #E7E5E4" }}>Reference</td>
              <td style={{ padding: "8px 0", fontWeight: 600, textAlign: "right", borderBottom: "1px solid #E7E5E4", fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.5px", fontSize: "13px", color: "#1C1917" }}>
                {requestId.slice(0, 8).toUpperCase()}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#78716C" }}>Amount</td>
              <td style={{ padding: "8px 0", fontWeight: 600, textAlign: "right", color: "#1C1917" }}>{amount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: "center" }}>
        <a href={`${APP_URL}/patient/intakes/${requestId}`} className="button">
          Track Your Request
        </a>
      </div>

      <p style={{ fontSize: "13px", color: "#A8A29E", marginTop: "24px" }}>
        A receipt has been sent to your email. If you need an invoice for tax purposes, you can download it from your
        dashboard.
      </p>
    </BaseLayout>
  )
}
