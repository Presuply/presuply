'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Stage = 'loading' | 'form' | 'success' | 'error'

const ic = 'w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-4 py-3 text-base focus:outline-none focus:border-[#FF6A00] transition-colors'
const bp = 'w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('form')
    })

    const timeout = setTimeout(() => {
      setStage(prev => prev === 'loading' ? 'error' : prev)
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
      return
    }

    setStage('success')
    setTimeout(() => router.replace('/dashboard'), 2000)
  }

  const base = 'min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center px-4'

  if (stage === 'loading') {
    return (
      <main className={base}>
        <p className="text-sm text-[#A9B5C2] italic">Verificando enlace...</p>
      </main>
    )
  }

  if (stage === 'error') {
    return (
      <main className={base}>
        <div className="w-full max-w-sm space-y-4 text-center">
          <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
            El enlace ha expirado o ya fue usado. Solicita uno nuevo desde el login.
          </p>
          <a href="/login" className="inline-block bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-6 py-3 text-base transition-colors">
            Volver al login
          </a>
        </div>
      </main>
    )
  }

  if (stage === 'success') {
    return (
      <main className={base}>
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="rounded-[8px] bg-green-50 dark:bg-green-900/20 border border-[#1FB57A]/40 px-4 py-3 text-sm text-[#1FB57A]">
            Contraseña actualizada correctamente. Redirigiendo...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className={base}>
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center gap-3">
          <img src="/images/logo.svg" alt="Presuply" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Nueva contraseña</h1>
        </div>

        <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nueva contraseña (mínimo 8 caracteres)"
              required
              autoFocus
              className={ic}
            />
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirmar contraseña"
              required
              className={ic}
            />
            <button type="submit" disabled={saving} className={bp}>
              {saving ? 'Guardando...' : 'Establecer nueva contraseña'}
            </button>
            {error && (
              <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
                {error}
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
          <a href="/login" className="font-semibold text-[#FF6A00] hover:text-[#FF9248]">
            Volver al login
          </a>
        </p>

      </div>
    </main>
  )
}
