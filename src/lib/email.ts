import nodemailer from 'nodemailer'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amareeyob533@gmail.com'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  transporter = nodemailer.createTransport({
    host,
    port: port || 587,
    secure: (port || 587) === 465,
    auth: { user, pass },
  })
  return transporter
}

export interface EmailResult {
  sent: boolean
  method: 'smtp' | 'log'
  to: string
  subject: string
}

/** Send an email. Falls back to console logging when SMTP is not configured (sandbox). */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  const transport = getTransporter()
  if (!transport) {
    // Sandbox fallback: log the email so the flow is observable.
    console.log('\n========== EMAIL (sandbox log) ==========')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Body:', html.replace(/<[^>]+>/g, ''))
    console.log('==========================================\n')
    return { sent: true, method: 'log', to, subject }
  }
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || `"Habesha Exchange" <${ADMIN_EMAIL}>`,
      to,
      subject,
      html,
    })
    return { sent: true, method: 'smtp', to, subject }
  } catch (err) {
    console.error('Email send failed, falling back to log:', err)
    console.log('\n========== EMAIL (fallback log) ==========')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('==========================================\n')
    return { sent: true, method: 'log', to, subject }
  }
}

/** Notify admin about a new deposit, with one-click Approve / Reject links. */
export async function notifyAdminDeposit(params: {
  uid: string
  amount: number
  token: string
  network: string
  approveUrl: string
  rejectUrl: string
}) {
  const { uid, amount, token, network, approveUrl, rejectUrl } = params
  const time = new Date().toISOString()
  const subject = `[Action Required] Approve Deposit — User ${uid} · ${amount} ${token}`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;background:#0b0b10;border:1px solid #1f1f26;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#FCD66B,#F0B90B 50%,#C8901A);padding:20px 24px">
        <h2 style="margin:0;color:#0A0A0C;font-size:18px">Habesha Exchange — Deposit Approval Required</h2>
      </div>
      <div style="padding:24px;color:#F4F4F7">
        <p style="margin:0 0 4px">A user has submitted a deposit confirmation. The funds have <b>NOT</b> been credited yet.</p>
        <p style="margin:0 0 16px;color:#8B8B95;font-size:13px">Review the details below and click <b style="color:#0ECB81">Approve</b> to credit the user's balance, or <b style="color:#F6465D">Reject</b> to decline.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
          <tr><td style="padding:10px;border:1px solid #1f1f26;background:#111116;font-weight:bold;color:#F0B90B">User UID</td><td style="padding:10px;border:1px solid #1f1f26;background:#111116">${uid}</td></tr>
          <tr><td style="padding:10px;border:1px solid #1f1f26;background:#111116;font-weight:bold;color:#F0B90B">Amount</td><td style="padding:10px;border:1px solid #1f1f26;background:#111116">${amount} ${token}</td></tr>
          <tr><td style="padding:10px;border:1px solid #1f1f26;background:#111116;font-weight:bold;color:#F0B90B">Network</td><td style="padding:10px;border:1px solid #1f1f26;background:#111116">${network}</td></tr>
          <tr><td style="padding:10px;border:1px solid #1f1f26;background:#111116;font-weight:bold;color:#F0B90B">Time (UTC)</td><td style="padding:10px;border:1px solid #1f1f26;background:#111116">${time}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:0 4px 0 0;width:50%">
              <a href="${approveUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#0ECB81,#0BA56A);color:#fff;text-decoration:none;padding:14px 0;border-radius:8px;font-weight:bold;font-size:15px">✓ APPROVE DEPOSIT</a>
            </td>
            <td style="padding:0 0 0 4px;width:50%">
              <a href="${rejectUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#F6465D,#E0364E);color:#fff;text-decoration:none;padding:14px 0;border-radius:8px;font-weight:bold;font-size:15px">✕ REJECT</a>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;color:#8B8B95;font-size:12px;line-height:1.5">
          If the buttons don't work, copy these links into your browser:<br>
          Approve: <span style="color:#F0B90B;word-break:break-all">${approveUrl}</span><br>
          Reject: <span style="color:#F0B90B;word-break:break-all">${rejectUrl}</span>
        </p>
        <p style="margin:16px 0 0;color:#555;font-size:11px">This is an automated notification from Habesha Exchange. The approval links expire in 7 days.</p>
      </div>
    </div>
  `
  return sendEmail(ADMIN_EMAIL, subject, html)
}
