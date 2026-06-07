'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Footer from '@/components/Footer'

const ic = 'w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-4 py-3 text-base focus:outline-none focus:border-[#FF6A00] transition-colors'
const bp = 'w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message ?? ''
      setError(
        msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')
          ? 'Confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada (y la carpeta de spam).'
          : 'Email o contraseña incorrectos.'
      )
      setLoading(false)
      return
    }
    router.replace('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center gap-3">
          <img src="/images/logo.svg" alt="Presuply" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Iniciar sesión</h1>
        </div>

        <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required autoFocus className={ic} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña" required className={ic} />
            <button type="submit" disabled={loading} className={bp}>
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
            {error && (
              <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
                {error}
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="font-semibold text-[#FF6A00] hover:text-[#FF9248]">
            Regístrate
          </a>
        </p>

      </div>
      </div>
      <Footer />
    </main>
  )
}
