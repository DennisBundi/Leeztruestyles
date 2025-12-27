import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Period = 'day' | 'week' | 'month' | 'year' | 'all';

interface PlatformStat {
  platform: string;
  count: number;
  displayName: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role - only admins and managers can view dashboard stats
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get period from query params (default to 'month')
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') || 'month') as Period;

    // Calculate date range based on period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (period) {
      case 'day':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6); // Last 7 days including today
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'all':
        // No date filter
        break;
    }

    // Build query
    let query = adminClient
      .from('orders')
      .select('social_platform')
      .eq('sale_type', 'pos')
      .eq('status', 'completed')
      .not('social_platform', 'is', null);

    // Add date filter if period is not 'all'
    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    const { data: orders, error } = await query;

    if (error) {
      // Check if error is about missing column
      if (error.message && error.message.includes('social_platform')) {
        return NextResponse.json(
          {
            error: 'Migration required',
            message: 'Social platform tracking is not enabled. Please run the migration: add_social_platform_to_orders.sql',
          },
          { status: 400 }
        );
      }
      console.error('Error fetching social platform stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch social platform statistics' },
        { status: 500 }
      );
    }

    // Group by platform and count
    const platformCounts = new Map<string, number>();
    const platformNames: Record<string, string> = {
      tiktok: 'TikTok',
      instagram: 'Instagram',
      whatsapp: 'WhatsApp',
      walkin: 'Walk-in',
    };

    (orders || []).forEach((order: any) => {
      if (order.social_platform) {
        const platform = order.social_platform.toLowerCase();
        const currentCount = platformCounts.get(platform) || 0;
        platformCounts.set(platform, currentCount + 1);
      }
    });

    // Convert to array and sort by count (descending)
    const platforms: PlatformStat[] = Array.from(platformCounts.entries())
      .map(([platform, count]) => ({
        platform,
        count,
        displayName: platformNames[platform] || platform,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate total
    const totalOrders = platforms.reduce((sum, p) => sum + p.count, 0);

    // Add percentage and rank to each platform
    const platformsWithStats = platforms.map((platform, index) => ({
      ...platform,
      percentage: totalOrders > 0 ? Math.round((platform.count / totalOrders) * 100) : 0,
      rank: index + 1,
    }));

    return NextResponse.json({
      platforms: platformsWithStats,
      period,
      totalOrders,
    });
  } catch (error) {
    console.error('Social platform stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social platform statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}




