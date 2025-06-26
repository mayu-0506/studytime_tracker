import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

// Create clients
const anonClient = createClient(supabaseUrl, supabaseAnonKey)
const serviceClient = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

async function checkProfiles() {
  console.log('🔍 Checking profiles table...\n')
  
  // 1. Check with anon key (respects RLS)
  console.log('1. Checking with ANON key (respects RLS):')
  const { data: anonData, error: anonError } = await anonClient
    .from('profiles')
    .select('*')
  
  if (anonError) {
    console.log('   ❌ Error:', anonError.message)
  } else {
    console.log('   ✅ Found', anonData?.length || 0, 'profiles')
    if (anonData && anonData.length > 0) {
      console.log('   Sample:', JSON.stringify(anonData[0], null, 2))
    }
  }
  
  // 2. Check with service key (bypasses RLS) if available
  if (serviceClient) {
    console.log('\n2. Checking with SERVICE key (bypasses RLS):')
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('profiles')
      .select('*')
    
    if (serviceError) {
      console.log('   ❌ Error:', serviceError.message)
    } else {
      console.log('   ✅ Found', serviceData?.length || 0, 'profiles')
      if (serviceData && serviceData.length > 0) {
        console.log('   First 3 profiles:')
        serviceData.slice(0, 3).forEach((profile, i) => {
          console.log(`   ${i + 1}. ID: ${profile.id}, Email: ${profile.email}, Name: ${profile.name}`)
        })
      }
    }
  } else {
    console.log('\n2. Service key not found - skipping admin check')
  }
  
  // 3. Check current auth user
  console.log('\n3. Checking current authenticated user:')
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  
  if (authError || !user) {
    console.log('   ❌ No authenticated user')
  } else {
    console.log('   ✅ User ID:', user.id)
    console.log('   Email:', user.email)
    
    // Check if this user has a profile
    const { data: userProfile, error: profileError } = await anonClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.log('   ❌ Profile error:', profileError.message)
    } else if (userProfile) {
      console.log('   ✅ Profile found:', JSON.stringify(userProfile, null, 2))
    }
  }
  
  // 4. Check auth.users table (only with service key)
  if (serviceClient) {
    console.log('\n4. Checking auth.users table:')
    const { data: authUsers, error: authUsersError } = await serviceClient.auth.admin.listUsers()
    
    if (authUsersError) {
      console.log('   ❌ Error:', authUsersError.message)
    } else {
      console.log('   ✅ Found', authUsers.users.length, 'users in auth.users')
      if (authUsers.users.length > 0) {
        console.log('   First user:', {
          id: authUsers.users[0].id,
          email: authUsers.users[0].email,
          created_at: authUsers.users[0].created_at
        })
      }
    }
  }
}

checkProfiles().catch(console.error)