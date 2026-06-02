'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
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
      <form onSubmit={handleSubmit}>
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
    </main>
  )
}
