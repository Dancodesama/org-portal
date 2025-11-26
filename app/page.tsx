import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/AdminDashboard'
import StaffDashboard from '@/components/StaffDashboard'
import { LogOut, Shield, User as UserIcon } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return <div className="flex h-screen items-center justify-center text-white">Error: Profile not found</div>
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <nav className="glass-card mb-8 rounded-2xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              {profile.role === 'admin' ? <Shield size={20} /> : <UserIcon size={20} />}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {profile.role === 'admin' ? 'Admin Portal' : 'Staff Portal'}
              </h1>
              <p className="text-xs text-slate-400">Organization Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="hidden text-sm text-slate-400 sm:block">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                className="group flex items-center gap-2 rounded-lg bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-red-500/10 hover:text-red-400"
                type="submit"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[1600px]">
        {profile.role === 'admin' ? (
          <AdminDashboard user={user} />
        ) : (
          <StaffDashboard user={user} />
        )}
      </div>
    </main>
  )
}
