import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBirthdayOfferEmail } from '@/lib/email/service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  const { data: accounts, error } = await admin
    .rpc('get_birthday_users', { p_month: month, p_day: day })

  if (error) {
    console.error('[cron] birthday-emails query failed:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  let sent = 0

  for (const account of accounts ?? []) {
    try {
      const code = `BDAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error: insertError } = await admin.from('reward_codes').insert({
        user_id: account.user_id,
        code,
        type: 'birthday',
        discount_percent: 10,
        expires_at: expiresAt.toISOString(),
      })
      if (insertError) {
        console.error(`[cron] reward_codes insert failed for user ${account.user_id}:`, insertError)
        continue
      }

      await sendBirthdayOfferEmail(account.user_id, code, expiresAt.toISOString())
      sent++
    } catch (err) {
      console.error(`[cron] birthday email failed for user ${account.user_id}:`, err)
    }
  }

  return NextResponse.json({ sent })
}
