import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  // Regular client for auth check
  const supabase = await createClient()
  
  try {
    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authError: authError?.message 
      }, { status: 401 })
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all profiles data using service role (bypasses RLS)
    const { data: allProfilesAdmin, error: allProfilesAdminError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Get current user's profile specifically
    const { data: currentUserProfile, error: currentProfileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get profiles with regular client (RLS applied)
    const { data: profilesWithRLS, error: rlsError } = await supabase
      .from("profiles")
      .select("*")

    // Check if profiles table exists
    const { data: tables, error: tablesError } = await supabaseAdmin
      .rpc('get_table_names', { schema_name: 'public' })
      .then(result => {
        // If RPC doesn't exist, try a direct query
        if (result.error) {
          return supabaseAdmin
            .from('profiles')
            .select('id')
            .limit(0)
            .then(r => ({ data: r.error ? [] : ['profiles'], error: r.error }))
        }
        return result
      })

    // Get auth.users data if we have service role key
    let authUsersData = null
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers()
        authUsersData = {
          total_users: authUsers?.users?.length || 0,
          current_user_in_auth: authUsers?.users?.find(u => u.id === user.id),
          error: authUsersError?.message
        }
      } catch (e) {
        authUsersData = { error: 'Unable to access auth.admin - service role key may be invalid' }
      }
    }

    const debugInfo = {
      current_user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata
      },
      service_role_access: {
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        profiles_table_exists: tables && Array.isArray(tables) && tables.includes('profiles'),
        all_profiles_count: allProfilesAdmin?.length || 0,
        all_profiles_error: allProfilesAdminError?.message
      },
      current_user_profile: {
        exists: !!currentUserProfile,
        data: currentUserProfile,
        error: currentProfileError?.message
      },
      rls_comparison: {
        profiles_with_rls_count: profilesWithRLS?.length || 0,
        profiles_without_rls_count: allProfilesAdmin?.length || 0,
        rls_error: rlsError?.message
      },
      all_profiles_preview: allProfilesAdmin?.slice(0, 5).map(p => ({
        id: p.id,
        email: p.email,
        name: p.name,
        created_at: p.created_at
      })),
      auth_users: authUsersData,
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }
    
    return NextResponse.json(debugInfo, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug failed', 
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}