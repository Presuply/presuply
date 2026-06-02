'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <main>
        <h1>Cuenta creada</h1>
        <p>Revisa tu email para confirmar la cuenta antes de entrar.</p>
        <a href="/login">Ir al login</a>
      </main>
    )
  }

  return (
    <main>
      <h1>Crear cuenta (desarrollo)</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          autoFocus
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="contraseña (mínimo 6 caracteres)"
          minLength={6}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
      <a href="/login">Ya tengo cuenta</a>
    </main>
  )
}
