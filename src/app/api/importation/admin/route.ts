import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) return null;
  const role = await getUserRole(user.id);
  if (role !== "admin" && role !== "manager") return null;
  return user;
}

// GET: list all applications with optional filters + stats
export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const admin = createAdminClient();

  // Stats (always returned)
  try {
    const [totalRes, pendingRes, approvedRes] = await Promise.all([
      admin.from("import_waitlist").select("*", { count: "exact", head: true }),
      admin.from("import_waitlist").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("import_waitlist").select("*", { count: "exact", head: true }).eq("status", "approved"),
    ]);

    const stats = {
      total: totalRes.count || 0,
      pending: pendingRes.count || 0,
      approved: approvedRes.count || 0,
    };

    let query = admin
      .from("import_waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (category && category !== "all") query = query.eq("goods_category", category);

    const { data, error } = await query;
    if (error) {
      console.error("Importation admin GET error:", error);
      return NextResponse.json({ error: "Failed to fetch applications." }, { status: 500 });
    }

    return NextResponse.json({ data, stats });
  } catch (err) {
    console.error("Importation admin GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface AdminPatchBody {
  id: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string | null;
}

// PATCH: update status and optional admin_note for one application
export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as AdminPatchBody;
  const { id, status, admin_note } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  if (!["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("import_waitlist")
    .update({ status, admin_note: admin_note || null })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Importation admin PATCH error:", error);
    return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
  }

  return NextResponse.json({ data });
}
