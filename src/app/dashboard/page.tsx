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
    const { data: uploadRows } = await supabase.from('uploads').select('id, storage_path').eq('budget_id', budgetId)
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
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo.svg" alt="Presuply" className="h-7 w-auto" />
            <h1 className="text-xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Presupuestos</h1>
          </div>
          <div className="flex items-center gap-3">
            {hasSubscription && (
              <button type="button" onClick={handlePortal} disabled={openingPortal}
                className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] disabled:opacity-40 transition-colors">
                {openingPortal ? 'Abriendo...' : 'Suscripción'}
              </button>
            )}
            <Link href="/dashboard/perfil" className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors">
              Mi perfil
            </Link>
            <Link href="/dashboard/nuevo"
              className="bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2.5 text-sm transition-colors">
              + Nuevo
            </Link>
          </div>
        </div>

        {/* Banner trial */}
        {isTrial && !loading && (
          <div className={`rounded-[12px] border px-4 py-3 flex items-center justify-between gap-4 ${
            remaining === 0
              ? 'bg-red-50 dark:bg-red-900/20 border-[#E5484D]/40'
              : remaining === 1
              ? 'bg-orange-50 dark:bg-orange-900/20 border-[#FF6A00]/40'
              : 'bg-blue-50 dark:bg-blue-900/20 border-[#3E7BFA]/40'
          }`}>
            <p className={`text-sm font-medium ${
              remaining === 0 ? 'text-[#E5484D]' : remaining === 1 ? 'text-[#CC5500] dark:text-[#FF9248]' : 'text-[#3E7BFA]'
            }`}>
              {remaining === 0
                ? 'Has agotado los presupuestos gratuitos.'
                : `Te quedan ${remaining} de ${TRIAL_LIMIT} presupuesto${remaining === 1 ? '' : 's'} gratuito${remaining === 1 ? '' : 's'}.`}
            </p>
            <Link href="/pricing"
              className="shrink-0 bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-3 py-1.5 text-xs transition-colors">
              Activar plan
            </Link>
          </div>
        )}

        {/* Pago pendiente */}
        {subscriptionStatus === 'past_due' && !loading && (
          <div className="rounded-[12px] border border-[#E5484D]/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-[#E5484D]">
              Pago pendiente — actualiza tu método de pago para seguir usando Presuply.
            </p>
            <button type="button" onClick={handlePortal} disabled={openingPortal}
              className="shrink-0 bg-[#E5484D] hover:bg-red-700 text-white font-semibold rounded-[8px] px-3 py-1.5 text-xs disabled:opacity-40 transition-colors">
              Actualizar pago
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#A9B5C2] italic">Cargando...</p>
        ) : budgets.length === 0 ? (
          <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm px-6 py-12 text-center space-y-4">
            <p className="text-[#6B7B8C] dark:text-[#A9B5C2]">Aún no tienes presupuestos.</p>
            <Link href="/dashboard/nuevo"
              className="inline-block bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-6 py-3 text-sm transition-colors">
              Crear el primero
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {budgets.map(b => (
              <li key={b.id} className="flex items-stretch gap-2">
                <Link href={`/dashboard/presupuesto/${b.id}`}
                  className="flex flex-1 items-center justify-between gap-4 bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] hover:border-[#FF6A00]/50 px-4 py-4 transition-colors min-w-0 shadow-sm">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#A9B5C2]">#{b.budget_number}</span>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        b.status === 'sent'
                          ? 'bg-[#1FB57A]/15 text-[#1FB57A]'
                          : 'bg-[#EDF0F4] dark:bg-[#3A4A5C] text-[#6B7B8C] dark:text-[#A9B5C2]'
                      }`}>
                        {b.status === 'sent' ? 'Enviado' : 'Borrador'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] truncate">
                      {b.client_name ?? 'Sin cliente'}
                    </p>
                    <p className="text-xs text-[#A9B5C2]">
                      {b.issued_date ? fmtDate(b.issued_date) : '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">{fmt(b.total)} €</p>
                  </div>
                </Link>

                <button type="button" onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}
                  aria-label="Eliminar presupuesto"
                  className="flex items-center justify-center w-12 shrink-0 bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#A9B5C2] hover:text-[#E5484D] hover:border-[#E5484D]/40 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors shadow-sm">
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
