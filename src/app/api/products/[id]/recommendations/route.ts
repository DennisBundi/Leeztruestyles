import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 3600;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('get_product_recommendations', {
    p_product_id: params.id,
    p_limit: 4,
  });

  if (error) {
    return NextResponse.json({ recommendations: [] });
  }

  return NextResponse.json({ recommendations: data ?? [] });
}
