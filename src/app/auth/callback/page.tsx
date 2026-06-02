'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')

    if (!code) {
      router.replace('/login')
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
  }, [searchParams, router])

  if (error) {
    return (
      <main>
        <p role="alert">{error}</p>
        <a href="/login">Volver al login</a>
      </main>
    )
  }

  return <main><p>Verificando enlace...</p></main>
}

// useSearchParams requiere Suspense en Next.js App Router
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main><p>Cargando...</p></main>}>
      <CallbackHandler />
    </Suspense>
  )
}
