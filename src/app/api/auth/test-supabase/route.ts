import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const config = {
      hasUrl: !!supabaseUrl && supabaseUrl !== 'placeholder' && supabaseUrl.trim() !== '',
      hasKey: !!supabaseKey && supabaseKey !== 'placeholder' && supabaseKey.trim() !== '',
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Not set',
    };

    if (!config.hasUrl || !config.hasKey) {
      return NextResponse.json({
        configured: false,
        message: 'Supabase is not properly configured',
        config,
      });
    }

    const supabase = await createClient();
    
    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    return NextResponse.json({
      configured: true,
      connection: error ? 'Failed' : 'Success',
      error: error?.message,
      config: {
        ...config,
        urlPreview: supabaseUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      error: error.message,
    });
  }
}









