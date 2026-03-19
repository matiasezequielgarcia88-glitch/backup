// supabase/functions/create-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: callerUser } } = await supabaseClient.auth.getUser()
    if (!callerUser) throw new Error('Unauthorized')

    const { email, password, full_name, role, organization_id } = await req.json()

    if (!email || !password || !full_name || !role) {
      throw new Error('Faltan campos requeridos')
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres')
    }

    // Get caller profile for the specific organization
    // If organization_id is provided, use that; otherwise use first profile
    let callerProfile
    if (organization_id) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('role, organization_id')
        .eq('user_id', callerUser.id)
        .eq('organization_id', organization_id)
        .single()
      callerProfile = data
    }

    // Fallback to first profile
    if (!callerProfile) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('role, organization_id')
        .eq('user_id', callerUser.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      callerProfile = data
    }

    if (!callerProfile) throw new Error('Profile not found')

    // Only admin and superadmin can create users
    if (!['admin', 'superadmin'].includes(callerProfile.role)) {
      throw new Error('Solo los administradores pueden crear usuarios')
    }

    // Only superadmin can create admin or superadmin
    if (['admin', 'superadmin'].includes(role) && callerProfile.role !== 'superadmin') {
      throw new Error('Solo el superadmin puede crear administradores')
    }

    // Use provided org or caller's org
    const targetOrgId = organization_id || callerProfile.organization_id

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No se pudo crear el usuario')

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      user_id: authData.user.id,
      organization_id: targetOrgId,
      full_name,
      role,
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
