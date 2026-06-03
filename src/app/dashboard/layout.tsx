'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  )

  useEffect(() => {
    if (!supabaseConfigured) {
      setChecking(false)
      return
    }
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setChecking(false)
      }
    })
  }, [router, supabaseConfigured])

  if (checking) return null

  if (!supabaseConfigured) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Falta configurar Supabase</h1>
          <p className="text-sm text-gray-600">
            Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
            en tu entorno para acceder al dashboard.
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-700 transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
