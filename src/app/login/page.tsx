'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()

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
      <main>
        <h1>Revisa tu email</h1>
        <p>Te hemos enviado un enlace de acceso a {email}.</p>
        <p>Puedes cerrar esta pestaña.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Acceder</h1>

      <form onSubmit={handleMagicLink}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>

      <hr />
      <p>Acceso temporal con contraseña (solo desarrollo)</p>

      <form onSubmit={handlePassword}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="contraseña"
          required
        />
        <button type="submit" disabled={pwdLoading}>
          {pwdLoading ? 'Entrando...' : 'Entrar con contraseña'}
        </button>
        {pwdError && <p role="alert">{pwdError}</p>}
      </form>
    </main>
  )
}
