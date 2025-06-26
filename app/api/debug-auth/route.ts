import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = await createClient()
  
  try {
    // Get both session and user for complete auth state
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        sessionError: sessionError?.message,
        userError: userError?.message,
        hasSession: !!session,
        sessionUserId: session?.user?.id
      }, { status: 401 })
    }

    // Cookie analysis
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieSize = new TextEncoder().encode(cookieHeader).length
    
    // Get service role data if available
    let serviceRoleData = null
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      try {
        // Get detailed user data from auth.users
        const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(user.id)
        
        serviceRoleData = {
          auth_users_data: {
            id: adminUser?.user?.id,
            email: adminUser?.user?.email,
            created_at: adminUser?.user?.created_at,
            updated_at: adminUser?.user?.updated_at,
            last_sign_in_at: adminUser?.user?.last_sign_in_at,
            email_confirmed_at: adminUser?.user?.email_confirmed_at,
            phone_confirmed_at: adminUser?.user?.phone_confirmed_at,
            role: adminUser?.user?.role,
            user_metadata: adminUser?.user?.user_metadata,
            app_metadata: adminUser?.user?.app_metadata,
            identities: adminUser?.user?.identities,
            factors: adminUser?.user?.factors
          },
          error: adminError?.message
        }
      } catch (e) {
        serviceRoleData = { error: 'Unable to access auth.admin - service role key may be invalid' }
      }
    }

    // Try to get profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    const authDebugInfo = {
      session_info: {
        has_session: !!session,
        access_token_present: !!session?.access_token,
        refresh_token_present: !!session?.refresh_token,
        expires_at: session?.expires_at,
        expires_in: session?.expires_in,
        token_type: session?.token_type,
        provider_token: session?.provider_token ? 'present' : 'missing',
        provider_refresh_token: session?.provider_refresh_token ? 'present' : 'missing',
        session_error: sessionError?.message
      },
      user_from_client: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        phone_confirmed_at: user.phone_confirmed_at,
        confirmed_at: user.confirmed_at,
        role: user.role,
        aud: user.aud,
        user_error: userError?.message
      },
      metadata_analysis: {
        user_metadata: {
          data: user.user_metadata,
          keys: Object.keys(user.user_metadata || {}),
          has_profile_data: !!(user.user_metadata?.name || user.user_metadata?.bio || user.user_metadata?.grade),
          profile_image_exists: !!user.user_metadata?.profile_image,
          profile_image_size: user.user_metadata?.profile_image ? 
            new TextEncoder().encode(user.user_metadata.profile_image).length : 0,
          profile_image_size_kb: user.user_metadata?.profile_image ? 
            (new TextEncoder().encode(user.user_metadata.profile_image).length / 1024).toFixed(2) + ' KB' : 'N/A'
        },
        app_metadata: {
          data: user.app_metadata,
          keys: Object.keys(user.app_metadata || {}),
          provider: user.app_metadata?.provider,
          providers: user.app_metadata?.providers
        }
      },
      profile_table_data: {
        exists: !!profile,
        data: profile,
        error: profileError?.message
      },
      auth_identities: user.identities?.map(identity => ({
        provider: identity.provider,
        user_id: identity.user_id,
        created_at: identity.created_at,
        updated_at: identity.updated_at
      })),
      auth_factors: user.factors,
      cookie_info: {
        total_size: cookieSize,
        total_size_kb: (cookieSize / 1024).toFixed(2) + ' KB',
        header_value: cookieHeader.substring(0, 200) + (cookieHeader.length > 200 ? '...' : '')
      },
      service_role_auth_data: serviceRoleData,
      environment: {
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        request_pathname: request.nextUrl.pathname
      },
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(authDebugInfo, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Auth debug failed', 
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}