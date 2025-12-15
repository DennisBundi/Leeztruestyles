/**
 * Script to create an admin user in Supabase
 * 
 * Usage:
 * 1. Make sure you have SUPABASE_SERVICE_ROLE_KEY in your .env.local file
 * 2. Run: node scripts/create-admin.js
 * 
 * Or provide email and password as arguments:
 * node scripts/create-admin.js leeztruestyles44@gmail.com yourpassword
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please make sure you have the following in your .env.local file:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

// Get email and password from command line arguments or use defaults
const email = process.argv[2] || 'leeztruestyles44@gmail.com';
const password = process.argv[3] || null;

if (!password) {
  console.error('❌ Error: Password is required');
  console.error('Usage: node scripts/create-admin.js <email> <password>');
  console.error('Example: node scripts/create-admin.js leeztruestyles44@gmail.com MySecurePassword123!');
  process.exit(1);
}

async function createAdminUser() {
  // Create Supabase admin client (uses service role key for admin operations)
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔄 Creating admin user...');
    console.log(`   Email: ${email}`);

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('ℹ️  User already exists. Checking if admin role is assigned...');
        
        // User exists, get the user
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const user = existingUser?.users?.find(u => u.email === email);
        
        if (!user) {
          console.error('❌ Error: Could not find existing user');
          process.exit(1);
        }

        // Check if user already has admin role
        const { data: existingEmployee } = await supabaseAdmin
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingEmployee) {
          console.log(`✅ User already has role: ${existingEmployee.role}`);
          if (existingEmployee.role === 'admin') {
            console.log('✅ Admin account already set up!');
            return;
          } else {
            console.log('⚠️  User exists but is not an admin. Updating role...');
            // Update to admin
            const { error: updateError } = await supabaseAdmin
              .from('employees')
              .update({ role: 'admin' })
              .eq('user_id', user.id);
            
            if (updateError) {
              console.error('❌ Error updating role:', updateError);
              process.exit(1);
            }
            console.log('✅ Role updated to admin!');
            return;
          }
        }

        // User exists but no employee record, create it
        const userId = user.id;
        const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
        
        const { error: employeeError } = await supabaseAdmin
          .from('employees')
          .insert({
            user_id: userId,
            role: 'admin',
            employee_code: employeeCode,
          });

        if (employeeError) {
          console.error('❌ Error creating employee record:', employeeError);
          process.exit(1);
        }

        console.log('✅ Admin account created successfully!');
        console.log(`   Employee Code: ${employeeCode}`);
        return;
      }
      console.error('❌ Error creating user:', authError.message);
      process.exit(1);
    }

    if (!authData?.user) {
      console.error('❌ Error: User creation failed - no user data returned');
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✅ User created with ID: ${userId}`);

    // Step 2: Create entry in users table
    const { error: userTableError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: 'Admin User',
      });

    if (userTableError && !userTableError.message.includes('duplicate')) {
      console.warn('⚠️  Warning: Could not create user profile:', userTableError.message);
    } else {
      console.log('✅ User profile created');
    }

    // Step 3: Create employee record with admin role
    const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: userId,
        role: 'admin',
        employee_code: employeeCode,
      })
      .select()
      .single();

    if (employeeError) {
      console.error('❌ Error creating employee record:', employeeError);
      process.exit(1);
    }

    console.log('\n✅ Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Employee Code: ${employeeCode}`);
    console.log(`   Role: admin`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 You can now sign in at: http://localhost:3000/dashboard');
    console.log(`   Email: ${email}`);
    console.log(`   Password: [the password you provided]`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createAdminUser();













