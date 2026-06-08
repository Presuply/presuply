'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Footer from '@/components/Footer'

const ic = 'w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-4 py-3 text-base focus:outline-none focus:border-[#FF6A00] transition-colors'
const bp = 'w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
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
          <h1 className="text-2xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Crear cuenta</h1>
        </div>

        <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required autoFocus className={ic} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña (mínimo 8 caracteres)" minLength={8} required className={ic} />
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 accent-[#FF6A00] w-4 h-4 shrink-0"
              />
              <span className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
                He leído y acepto los{' '}
                <a href="/terminos" target="_blank" rel="noopener noreferrer"
                  className="text-[#FF6A00] hover:underline">
                  Términos y Condiciones
                </a>{' '}
                y la{' '}
                <a href="/privacidad" target="_blank" rel="noopener noreferrer"
                  className="text-[#FF6A00] hover:underline">
                  Política de Privacidad
                </a>
              </span>
            </label>
            <button type="submit" disabled={loading || !accepted} className={bp}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            {error && (
              <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
                {error}
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="font-semibold text-[#FF6A00] hover:text-[#FF9248]">
            Iniciar sesión
          </a>
        </p>

      </div>
      </div>
      <Footer />
    </main>
  )
}
