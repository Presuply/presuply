'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ic = 'w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-4 py-3 text-base focus:outline-none focus:border-[#FF6A00] transition-colors'
const bp = 'w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

export default function RegisterPage() {
  const router = useRouter()
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!supabaseConfigured) return
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router, supabaseConfigured])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (!supabaseConfigured) {
      setError('Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).')
      setLoading(false)
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    else setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-3">
          <h1 className="text-2xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Cuenta creada</h1>
          <p className="text-[#6B7B8C] dark:text-[#A9B5C2]">Revisa tu email para confirmar la cuenta antes de entrar.</p>
          <a href="/login" className="inline-block bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-6 py-3 text-base transition-colors">
            Ir al login
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center gap-3">
          <img src="/images/logo.svg" alt="Presuply" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">
            Crear cuenta <span className="text-sm font-normal text-[#A9B5C2]">(desarrollo)</span>
          </h1>
        </div>

        {!supabaseConfigured && (
          <p role="alert" className="rounded-[8px] bg-orange-50 dark:bg-orange-900/20 border border-[#FF6A00]/40 px-4 py-3 text-sm text-[#CC5500] dark:text-[#FF9248]">
            Falta configurar Supabase. Define las variables de entorno para registrarte.
          </p>
        )}

        <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required autoFocus className={ic} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="contraseña (mínimo 6 caracteres)" minLength={6} required className={ic} />
            <button type="submit" disabled={loading || !supabaseConfigured} className={bp}>
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
            {error && <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">{error}</p>}
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="font-semibold text-[#FF6A00] hover:text-[#FF9248]">
            Iniciar sesión
          </a>
        </p>
      </div>
    </main>
  )
}
