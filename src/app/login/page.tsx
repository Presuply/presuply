'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

const btnPrimary =
  'w-full rounded-lg bg-gray-900 px-4 py-3 text-base font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

export default function LoginPage() {
  const router = useRouter()
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  )

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!supabaseConfigured) {
      setError('Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('No se pudo enviar el enlace. Inténtalo de nuevo.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdLoading(true)
    setPwdError(null)

    if (!supabaseConfigured) {
      setPwdError('Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).')
      setPwdLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setPwdError('Email o contraseña incorrectos.')
    } else {
      router.replace('/dashboard')
    }
    setPwdLoading(false)
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Revisa tu email</h1>
          <p className="text-gray-500">
            Te hemos enviado un enlace de acceso a{' '}
            <span className="font-medium text-gray-900">{email}</span>.
          </p>
          <p className="text-sm text-gray-400">Puedes cerrar esta pestaña.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Acceder</h1>

        {!supabaseConfigured && (
          <p
            role="alert"
            className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
          >
            Falta configurar Supabase. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu
            entorno para poder iniciar sesión.
          </p>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <form onSubmit={handleMagicLink} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
              className={inputClass}
            />
            <button type="submit" disabled={loading || !supabaseConfigured} className={btnPrimary}>
              {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
            </button>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">o</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <div className="rounded-lg border border-dashed border-gray-200 p-4 space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Contraseña — solo desarrollo
            </p>
            <form onSubmit={handlePassword} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className={inputClass}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="contraseña"
                required
                className={inputClass}
              />
              <button type="submit" disabled={pwdLoading || !supabaseConfigured} className={btnPrimary}>
                {pwdLoading ? 'Entrando...' : 'Entrar con contraseña'}
              </button>
              {pwdError && (
                <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {pwdError}
                </p>
              )}
            </form>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="font-medium text-gray-900 hover:underline">
            Crear cuenta
          </a>
        </p>
      </div>
    </main>
  )
}
