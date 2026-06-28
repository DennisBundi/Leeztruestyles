import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole, canAccessSection } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id)
    if (!canAccessSection(userRole, 'analytics')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { data: allUsers, error } = await adminClient
      .from('users')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const users = allUsers || []
    const now = new Date()

    // Midnight UTC for each boundary
    const todayStartISO = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    ).toISOString()
    const monthStartISO = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    ).toISOString()
    const weekAgoISO = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7)
    ).toISOString()

    const totalUsers = users.length
    const today = users.filter((u: any) => u.created_at >= todayStartISO).length
    const thisMonth = users.filter((u: any) => u.created_at >= monthStartISO).length
    const newThisWeek = users.filter((u: any) => u.created_at >= weekAgoISO).length

    // Last 30 days: one entry per UTC calendar day, oldest first
    const signupsByDay = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
      )
      const dateStr = d.toISOString().slice(0, 10) // "YYYY-MM-DD"
      const count = users.filter((u: any) => u.created_at.startsWith(dateStr)).length
      signupsByDay.push({ date: dateStr, count })
    }

    // Last 12 calendar months, oldest first
    const signupsByMonth = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const year = d.getUTCFullYear()
      const month = d.getUTCMonth() // 0-indexed
      const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
      const count = users.filter((u: any) => u.created_at.startsWith(monthPrefix)).length
      signupsByMonth.push({ month: MONTHS[month], count })
    }

    return NextResponse.json({
      users,
      signupsByDay,
      signupsByMonth,
      totalUsers,
      thisMonth,
      today,
      newThisWeek,
    })
  } catch (error) {
    console.error('[API] Analytics users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
