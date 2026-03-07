import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin/manager role
    const adminClient = createAdminClient();
    const { data: employee } = await adminClient
      .from("employees")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!employee || !["admin", "manager"].includes(employee.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all stats in parallel
    const [
      accountsResult,
      transactionsResult,
      referralsResult,
      reviewsResult,
    ] = await Promise.all([
      // Total accounts and tier breakdown
      adminClient.from("loyalty_accounts").select("tier"),

      // Transaction totals by type
      adminClient
        .from("loyalty_transactions")
        .select("type, points"),

      // Top referrers
      adminClient
        .from("referrals")
        .select("referrer_id, status"),

      // Review stats
      adminClient.from("reviews").select("status"),
    ]);

    // Compute tier breakdown
    const accounts = accountsResult.data || [];
    const tierBreakdown = { bronze: 0, silver: 0, gold: 0 };
    for (const acc of accounts) {
      if (acc.tier in tierBreakdown) {
        tierBreakdown[acc.tier as keyof typeof tierBreakdown]++;
      }
    }

    // Compute points issued and redeemed
    const transactions = transactionsResult.data || [];
    let totalPointsIssued = 0;
    let totalPointsRedeemed = 0;
    for (const tx of transactions) {
      if (tx.points > 0) {
        totalPointsIssued += tx.points;
      } else {
        totalPointsRedeemed += Math.abs(tx.points);
      }
    }

    // Compute top referrers (by completed referrals)
    const referrals = referralsResult.data || [];
    const referrerCounts: Record<string, number> = {};
    for (const ref of referrals) {
      if (ref.status === "completed") {
        referrerCounts[ref.referrer_id] = (referrerCounts[ref.referrer_id] || 0) + 1;
      }
    }

    // Get top 5 referrers with names
    const topReferrerIds = Object.entries(referrerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    let topReferrers: { user_id: string; name: string; referral_count: number }[] = [];
    if (topReferrerIds.length > 0) {
      const { data: users } = await adminClient
        .from("users")
        .select("id, full_name")
        .in("id", topReferrerIds);

      const nameMap: Record<string, string> = {};
      for (const u of users || []) {
        nameMap[u.id] = u.full_name || "Unknown";
      }

      topReferrers = topReferrerIds.map((id) => ({
        user_id: id,
        name: nameMap[id] || "Unknown",
        referral_count: referrerCounts[id],
      }));
    }

    // Review stats
    const reviews = reviewsResult.data || [];
    const reviewStats = { pending: 0, approved: 0, rejected: 0 };
    for (const r of reviews) {
      if (r.status in reviewStats) {
        reviewStats[r.status as keyof typeof reviewStats]++;
      }
    }

    return NextResponse.json({
      totalAccounts: accounts.length,
      tierBreakdown,
      totalPointsIssued,
      totalPointsRedeemed,
      topReferrers,
      reviewStats,
    });
  } catch (error) {
    console.error("Error fetching loyalty analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
