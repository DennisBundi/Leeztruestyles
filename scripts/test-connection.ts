import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing connection to:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    try {
        console.log('⏳ Attempting to fetch 1 user...');
        const { data, error } = await supabase.from('users').select('count').limit(1);

        if (error) {
            console.error('❌ Connection failed with Supabase error:', error.message);
        } else {
            console.log('✅ Connection successful!');
        }
    } catch (err: any) {
        console.error('❌ Connection failed with network error:', err.message);
        if (err.cause) console.error('   Cause:', err.cause);
    }
}

testConnection();
