import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()

    // 1. Check if the current user is logged in
    const {
        data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check if the current user is an admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
    }

    // 3. Parse the request body
    const { email, password } = await request.json()

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // 4. Create the new user using the Admin Client (Service Role)
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'User created successfully', user: data.user })
}
