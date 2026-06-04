'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  )

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { router.replace('/login'); return }
    if (!supabaseConfigured) {
      setError('Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).')
      return
    }
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError('El enlace ha expirado o ya fue usado. Solicita uno nuevo.')
      else router.replace('/dashboard')
    })
  }, [searchParams, router, supabaseConfigured])

  const base = 'min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center px-4'

  if (error) {
    return (
      <main className={base}>
        <div className="w-full max-w-sm space-y-4 text-center">
          <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
            {error}
          </p>
          <a href="/login" className="inline-block bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-6 py-3 text-base transition-colors">
            Volver al login
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className={base}>
      <p className="text-sm text-[#A9B5C2] italic">Verificando enlace...</p>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center px-4">
        <p className="text-sm text-[#A9B5C2] italic">Cargando...</p>
      </main>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
