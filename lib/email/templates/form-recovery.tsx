interface FormRecoveryEmailProps {
  firstName: string
  service: string
  resumeUrl: string
}

export function FormRecoveryEmail({ firstName, service, resumeUrl }: FormRecoveryEmailProps) {
  const serviceName = getServiceName(service)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Finish your ${serviceName} request</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF9;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #E7E5E4;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <a href="https://instantmed.com.au" style="text-decoration:none;font-size:17px;font-weight:700;color:#0C1220;letter-spacing:-0.4px;">Instant<span style="color:#0D9488;">Med</span></a>
            </td>
          </tr>
          <tr><td style="padding:20px 40px 0 40px;"><div style="border-top:1px solid #F5F5F4;"></div></td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 40px 36px 40px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#1C1917;letter-spacing:-0.4px;line-height:1.35;">
                Pick up where you left off
              </h1>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#44403C;">
                Hi ${firstName || "there"},
              </p>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#44403C;">
                You started a ${serviceName} request but didn't finish it. Your progress has been saved.
              </p>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#44403C;">
                Need a hand? Reply to this email and we'll help you out.
              </p>

              <!-- CTA -->
              <div style="text-align:center;margin:24px 0;">
                <a href="${resumeUrl}" style="display:inline-block;padding:12px 28px;background:#0C1220;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                  Continue my request
                </a>
              </div>

              <p style="margin:20px 0 0;font-size:13px;color:#A8A29E;">
                Your progress is saved for 24 hours. After that, you'll need to start over.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#FAFAF9;border-top:1px solid #F5F5F4;">
              <p style="margin:0 0 8px;font-size:12px;color:#A8A29E;text-align:center;">
                <a href="https://instantmed.com.au/privacy" style="color:#A8A29E;text-decoration:none;">Privacy</a>
                <span style="margin:0 6px;color:#E7E5E4;">&middot;</span>
                <a href="https://instantmed.com.au/terms" style="color:#A8A29E;text-decoration:none;">Terms</a>
                <span style="margin:0 6px;color:#E7E5E4;">&middot;</span>
                <a href="https://instantmed.com.au/contact" style="color:#A8A29E;text-decoration:none;">Contact</a>
              </p>
              <p style="margin:0;font-size:11px;color:#A8A29E;text-align:center;">
                InstantMed Pty Ltd &middot; ABN 64 694 559 334 &middot; Australia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

function getServiceName(service: string): string {
  const names: Record<string, string> = {
    "medical-certificate": "medical certificate",
    prescriptions: "prescription",
    pathology: "pathology request",
  }
  return names[service] || "request"
}

export default FormRecoveryEmail
