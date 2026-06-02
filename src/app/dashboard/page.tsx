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

export default function DashboardPage() {
  const router = useRouter()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('budgets')
        .select('*')
        .order('updated_at', { ascending: false })

      setBudgets(data ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  async function handleDelete(budgetId: string) {
    if (!window.confirm('¿Seguro que quieres borrar este presupuesto? Esta acción no se puede deshacer.')) return

    setDeletingId(budgetId)
    const supabase = createClient()

    // 1. Obtener rutas de Storage antes de borrar
    const { data: uploadRows } = await supabase
      .from('uploads')
      .select('id, storage_path')
      .eq('budget_id', budgetId)

    // 2. Borrar archivos de Storage
    if (uploadRows && uploadRows.length > 0) {
      await supabase.storage
        .from('uploads')
        .remove(uploadRows.map(u => u.storage_path))

      // 3. Borrar filas de uploads (ON DELETE SET NULL no las elimina)
      await supabase
        .from('uploads')
        .delete()
        .in('id', uploadRows.map(u => u.id))
    }

    // 4. Borrar el presupuesto (line_items se eliminan en cascada por ON DELETE CASCADE)
    await supabase.from('budgets').delete().eq('id', budgetId)

    // 5. Actualizar lista local sin recargar
    setBudgets(prev => prev.filter(b => b.id !== budgetId))
    setDeletingId(null)
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <Link
            href="/dashboard/nuevo"
            className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
          >
            + Nuevo
          </Link>
        </div>

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
                      <span className="text-xs font-medium text-gray-400">
                        #{b.budget_number}
                      </span>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          b.status === 'sent'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
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
                    <p className="text-base font-semibold text-gray-900">
                      {fmt(b.total)} €
                    </p>
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
