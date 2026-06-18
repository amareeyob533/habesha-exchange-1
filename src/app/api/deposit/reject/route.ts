import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyApprovalToken } from '@/lib/deposit-approval'

/**
 * Admin rejects a deposit by clicking the link in the email.
 * GET /api/deposit/reject?token=<signed>
 * Marks the deposit rejected (no balance change) and notifies the user.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return renderPage('error', 'Missing rejection token.')

  const depositId = verifyApprovalToken(token, 'reject')
  if (!depositId) return renderPage('error', 'This rejection link is invalid or has expired (7-day limit).')

  const deposit = await db.deposit.findUnique({ where: { id: depositId }, include: { user: true } })
  if (!deposit) return renderPage('error', 'Deposit not found.')

  if (deposit.status === 'rejected') {
    return renderPage('already', `Deposit of ${deposit.amount} ${deposit.token} (User ${deposit.user.uid}) was already rejected.`, deposit)
  }
  if (deposit.status === 'approved') {
    return renderPage('error', `This deposit was already approved and cannot be rejected.`)
  }

  await db.$transaction(async (tx) => {
    await tx.deposit.update({ where: { id: deposit.id }, data: { status: 'rejected' } })
    await tx.notification.create({
      data: {
        userId: deposit.userId,
        title: 'Deposit Rejected',
        message: `Your deposit of ${deposit.amount} ${deposit.token} on ${deposit.network} could not be confirmed and has been rejected. Please contact support if you believe this is an error.`,
        type: 'warning',
      },
    })
  })

  return renderPage('success', `You rejected the deposit of ${deposit.amount} ${deposit.token} from User ${deposit.user.uid}. No balance was credited.`, deposit)
}

function renderPage(kind: 'success' | 'error' | 'already', message: string, deposit?: any): NextResponse {
  const palette = {
    success: { color: '#F6465D', title: 'Deposit Rejected', emoji: '✕' },
    error: { color: '#F6465D', title: 'Action Failed', emoji: '✕' },
    already: { color: '#F0B90B', title: 'Already Processed', emoji: '●' },
  }[kind]
  const details = deposit
    ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:10px;border:1px solid #1f1f26;font-weight:bold;color:#F0B90B">User UID</td><td style="padding:10px;border:1px solid #1f1f26">${deposit.user?.uid || '—'}</td></tr>
        <tr><td style="padding:10px;border:1px solid #1f1f26;font-weight:bold;color:#F0B90B">Amount</td><td style="padding:10px;border:1px solid #1f1f26">${deposit.amount} ${deposit.token}</td></tr>
        <tr><td style="padding:10px;border:1px solid #1f1f26;font-weight:bold;color:#F0B90B">Network</td><td style="padding:10px;border:1px solid #1f1f26">${deposit.network}</td></tr>
      </table>`
    : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Habesha Exchange — ${palette.title}</title></head>
  <body style="margin:0;background:#07070A;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:480px;margin:60px auto;background:#0b0b10;border:1px solid #1f1f26;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#FCD66B,#F0B90B 50%,#C8901A);padding:18px 24px">
        <div style="color:#0A0A0C;font-weight:bold;font-size:15px">HABESHA EXCHANGE</div>
      </div>
      <div style="padding:32px 28px;color:#F4F4F7;text-align:center">
        <div style="width:64px;height:64px;border-radius:50%;background:${palette.color}22;color:${palette.color};font-size:30px;line-height:64px;margin:0 auto 16px;border:2px solid ${palette.color}">${palette.emoji}</div>
        <h1 style="margin:0 0 8px;font-size:22px;color:${palette.color}">${palette.title}</h1>
        <p style="margin:0 0 4px;color:#8B8B95;font-size:14px;line-height:1.5">${message}</p>
        ${details}
        <p style="margin:24px 0 0;color:#555;font-size:11px">Habesha Exchange · Admin Panel</p>
      </div>
    </div>
  </body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
