'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Budget } from '@/types/database'

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const TRIAL_LIMIT = 3

export default function DashboardPage() {
  const router = useRouter()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trial')
  const [budgetsUsed, setBudgetsUsed] = useState(0)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [budgetsRes, profileRes] = await Promise.all([
        supabase.from('budgets').select('*').order('updated_at', { ascending: false }),
        supabase.from('profiles').select('subscription_status, budgets_used').eq('id', user.id).single(),
      ])

      setBudgets(budgetsRes.data ?? [])
      if (profileRes.data) {
        setSubscriptionStatus(profileRes.data.subscription_status ?? 'trial')
        setBudgetsUsed(profileRes.data.budgets_used ?? 0)
      }
      setLoading(false)
    }

    load()
  }, [router])

  async function handleDelete(budgetId: string) {
    if (!window.confirm('¿Seguro que quieres borrar este presupuesto? Esta acción no se puede deshacer.')) return

    setDeletingId(budgetId)
    const supabase = createClient()

    const { data: uploadRows } = await supabase
      .from('uploads')
      .select('id, storage_path')
      .eq('budget_id', budgetId)

    if (uploadRows && uploadRows.length > 0) {
      await supabase.storage.from('uploads').remove(uploadRows.map(u => u.storage_path))
      await supabase.from('uploads').delete().in('id', uploadRows.map(u => u.id))
    }

    await supabase.from('budgets').delete().eq('id', budgetId)
    setBudgets(prev => prev.filter(b => b.id !== budgetId))
    setDeletingId(null)
  }

  async function handlePortal() {
    setOpeningPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setOpeningPortal(false)
    }
  }

  const remaining = Math.max(0, TRIAL_LIMIT - budgetsUsed)
  const isTrial = subscriptionStatus === 'trial'
  const hasSubscription = ['trialing', 'active', 'past_due'].includes(subscriptionStatus)

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <div className="flex items-center gap-3">
            {hasSubscription && (
              <button
                type="button"
                onClick={handlePortal}
                disabled={openingPortal}
                className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40 transition-colors"
              >
                {openingPortal ? 'Abriendo...' : 'Suscripción'}
              </button>
            )}
            <Link
              href="/dashboard/perfil"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Mi perfil
            </Link>
            <Link
              href="/dashboard/nuevo"
              className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
            >
              + Nuevo
            </Link>
          </div>
        </div>

        {/* Banner de trial */}
        {isTrial && !loading && (
          <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${
            remaining === 0
              ? 'bg-red-50 border-red-200'
              : remaining === 1
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm font-medium ${
              remaining === 0 ? 'text-red-700' : remaining === 1 ? 'text-amber-700' : 'text-blue-700'
            }`}>
              {remaining === 0
                ? 'Has agotado los presupuestos gratuitos.'
                : `Te quedan ${remaining} de ${TRIAL_LIMIT} presupuesto${remaining === 1 ? '' : 's'} gratuito${remaining === 1 ? '' : 's'}.`}
            </p>
            <Link
              href="/pricing"
              className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 transition-colors"
            >
              Activar plan
            </Link>
          </div>
        )}

        {/* Estado de pago pendiente */}
        {subscriptionStatus === 'past_due' && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-red-700">
              Pago pendiente — actualiza tu método de pago para seguir usando Presuply.
            </p>
            <button
              type="button"
              onClick={handlePortal}
              disabled={openingPortal}
              className="shrink-0 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              Actualizar pago
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 italic">Cargando...</p>
        ) : budgets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center space-y-3">
            <p className="text-gray-500">Aún no tienes presupuestos.</p>
            <Link
              href="/dashboard/nuevo"
              className="inline-block rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
            >
              Crear el primero
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {budgets.map(b => (
              <li key={b.id} className="flex items-stretch gap-2">
                <Link
                  href={`/dashboard/presupuesto/${b.id}`}
                  className="flex flex-1 items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 px-4 py-4 hover:border-gray-400 transition-colors min-w-0"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">#{b.budget_number}</span>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {b.status === 'sent' ? 'Enviado' : 'Borrador'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {b.client_name ?? 'Sin cliente'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {b.issued_date ? fmtDate(b.issued_date) : '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-semibold text-gray-900">{fmt(b.total)} €</p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  disabled={deletingId === b.id}
                  aria-label="Eliminar presupuesto"
                  className="flex items-center justify-center w-12 shrink-0 bg-white rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  {deletingId === b.id ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

      </div>
    </main>
  )
}
