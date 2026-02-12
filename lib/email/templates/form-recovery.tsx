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
<body style="margin:0;padding:0;background-color:#F8F9FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FA;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px 32px;">
              <a href="https://instantmed.com.au" style="text-decoration:none;font-size:18px;font-weight:700;color:#1A1A1A;letter-spacing:-0.3px;">InstantMed</a>
            </td>
          </tr>
          <tr><td style="padding:0 32px;"><div style="border-top:1px solid #F3F4F6;"></div></td></tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:24px 32px 32px 32px;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#1A1A1A;letter-spacing:-0.2px;">
                Pick up where you left off
              </h1>
              
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4B5563;">
                Hi ${firstName || "there"},
              </p>
              
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4B5563;">
                You started a ${serviceName} request but didn't finish it. Your progress has been saved.
              </p>
              
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4B5563;">
                Need a hand? Reply to this email and we'll help you out.
              </p>
              
              <!-- CTA -->
              <div style="margin:24px 0;">
                <a href="${resumeUrl}" style="display:inline-block;padding:12px 24px;background:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                  Continue my request
                </a>
              </div>
              
              <p style="margin:20px 0 0;font-size:13px;color:#9CA3AF;">
                Your progress is saved for 24 hours. After that, you'll need to start over.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#FAFAFA;border-top:1px solid #F3F4F6;">
              <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;text-align:center;">
                <a href="https://instantmed.com.au/privacy" style="color:#9CA3AF;text-decoration:underline;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="https://instantmed.com.au/terms" style="color:#9CA3AF;text-decoration:underline;">Terms</a>
                &nbsp;&middot;&nbsp;
                <a href="https://instantmed.com.au/contact" style="color:#9CA3AF;text-decoration:underline;">Contact</a>
              </p>
              <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">
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
