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

/** Notify admin about a new deposit. */
export async function notifyAdminDeposit(params: {
  uid: string
  amount: number
  token: string
  network: string
}) {
  const { uid, amount, token, network } = params
  const subject = `New Deposit — User ${uid}`
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:8px;padding:24px">
      <h2 style="color:#F0B90B;margin-top:0">Habesha Exchange — New Deposit</h2>
      <p>A user has submitted a deposit confirmation. Please review and approve in the admin panel.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">User UID</td><td style="padding:8px;border:1px solid #eee">${uid}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Amount</td><td style="padding:8px;border:1px solid #eee">${amount} ${token}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Network</td><td style="padding:8px;border:1px solid #eee">${network}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:bold">Time</td><td style="padding:8px;border:1px solid #eee">${new Date().toISOString()}</td></tr>
      </table>
      <p style="color:#888;font-size:12px">This is an automated notification from Habesha Exchange.</p>
    </div>
  `
  return sendEmail(ADMIN_EMAIL, subject, html)
}
