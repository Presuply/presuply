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

    if (!code) {
      router.replace('/login')
      return
    }

    if (!supabaseConfigured) {
      setError('Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).')
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('El enlace ha expirado o ya fue usado. Solicita uno nuevo.')
      } else {
        router.replace('/dashboard')
      }
    })
  }, [searchParams, router, supabaseConfigured])

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
          <a
            href="/login"
            className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-700 transition-colors"
          >
            Volver al login
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <p className="text-sm text-gray-400 italic">Verificando enlace...</p>
    </main>
  )
}

// useSearchParams requiere Suspense en Next.js App Router
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <p className="text-sm text-gray-400 italic">Cargando...</p>
        </main>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
