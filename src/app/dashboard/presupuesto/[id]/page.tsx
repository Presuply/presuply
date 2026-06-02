'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Confidence } from '@/types/database'

interface EditableLineItem {
  id: string
  description: string
  unit: string
  quantity: number
  unit_price: number
  total: number
  confidence: Confidence | null
  position: number
  _isNew: boolean
  _deleted: boolean
}

interface BudgetHeader {
  client_name: string
  client_email: string
  budget_number: number
  tax_rate: number
  valid_days: number
  issued_date: string
}

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

export default function PresupuestoEditorPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [lastChange, setLastChange] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [budget, setBudget] = useState<BudgetHeader>({
    client_name: '',
    client_email: '',
    budget_number: 0,
    tax_rate: 7,
    valid_days: 30,
    issued_date: new Date().toISOString().slice(0, 10),
  })

  const [lineItems, setLineItems] = useState<EditableLineItem[]>([])

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const { data: b } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', id)
        .single()

      if (!b) { setLoading(false); return }

      setBudget({
        client_name: b.client_name ?? '',
        client_email: b.client_email ?? '',
        budget_number: b.budget_number,
        tax_rate: Number(b.tax_rate),
        valid_days: b.valid_days ?? 30,
        issued_date: b.issued_date ?? new Date().toISOString().slice(0, 10),
      })

      const { data: items } = await supabase
        .from('line_items')
        .select('*')
        .eq('budget_id', id)
        .order('position')

      setLineItems(
        (items ?? []).map(item => ({
          id: item.id,
          description: item.description,
          unit: item.unit ?? '',
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
          confidence: item.confidence,
          position: item.position,
          _isNew: false,
          _deleted: false,
        }))
      )

      setLoading(false)
    }

    load()
  }, [id, router])

  // ── Totales ────────────────────────────────────────────────────────────────
  const visibleItems = lineItems.filter(i => !i._deleted)
  const subtotal = visibleItems.reduce((sum, i) => sum + i.total, 0)
  const taxAmount = subtotal * (budget.tax_rate / 100)
  const totalAmount = subtotal + taxAmount

  // ── Helpers de estado ──────────────────────────────────────────────────────
  function markDirty() {
    setDirty(true)
    setLastChange(Date.now())
  }

  function updateBudgetField<K extends keyof BudgetHeader>(key: K, value: BudgetHeader[K]) {
    setBudget(prev => ({ ...prev, [key]: value }))
    markDirty()
  }

  function updateItem(itemId: string, field: keyof EditableLineItem, value: string | number | null) {
    setLineItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    }))
    markDirty()
  }

  function addItem() {
    const maxPos = visibleItems.length > 0 ? Math.max(...visibleItems.map(i => i.position)) : -1
    setLineItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      description: '',
      unit: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
      confidence: null,
      position: maxPos + 1,
      _isNew: true,
      _deleted: false,
    }])
    markDirty()
  }

  function deleteItem(itemId: string) {
    setLineItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, _deleted: true } : i
    ))
    markDirty()
  }

  // ── Guardado ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setSaveError(null)

    const supabase = createClient()

    const { error: budgetErr } = await supabase
      .from('budgets')
      .update({
        client_name: budget.client_name || null,
        client_email: budget.client_email || null,
        tax_rate: budget.tax_rate,
        valid_days: budget.valid_days,
        issued_date: budget.issued_date,
        subtotal,
        tax_amount: taxAmount,
        total: totalAmount,
      })
      .eq('id', id)

    if (budgetErr) {
      setSaveError('Error al guardar. Inténtalo de nuevo.')
      setSaving(false)
      return
    }

    // Eliminar partidas marcadas (solo las que ya están en DB)
    for (const item of lineItems.filter(i => i._deleted && !i._isNew)) {
      await supabase.from('line_items').delete().eq('id', item.id)
    }

    // Insertar partidas nuevas
    for (const item of lineItems.filter(i => i._isNew && !i._deleted)) {
      const { data: inserted } = await supabase
        .from('line_items')
        .insert({
          budget_id: id,
          user_id: userId,
          description: item.description,
          unit: item.unit || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          confidence: item.confidence,
          position: item.position,
        })
        .select('id')
        .single()

      if (inserted) {
        setLineItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, id: inserted.id, _isNew: false } : i
        ))
      }
    }

    // Actualizar partidas existentes
    for (const item of lineItems.filter(i => !i._isNew && !i._deleted)) {
      await supabase
        .from('line_items')
        .update({
          description: item.description,
          unit: item.unit || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          position: item.position,
        })
        .eq('id', item.id)
    }

    setLineItems(prev => prev.filter(i => !i._deleted))
    setDirty(false)
    setSaving(false)
  }

  // Ref para que el autosave siempre llame a la versión más reciente
  const handleSaveRef = useRef(handleSave)
  useEffect(() => { handleSaveRef.current = handleSave })

  // Autosave: 30 s tras el último cambio
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => handleSaveRef.current(), 30000)
    return () => clearTimeout(timer)
  }, [lastChange, dirty])

  function handleGeneratePDF() {
    console.log('Etapa 6 — datos para el PDF:', {
      budget: { ...budget, id, subtotal, taxAmount, total: totalAmount },
      lineItems: visibleItems,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400 italic">Cargando presupuesto...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Barra superior */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-900 text-sm transition-colors shrink-0">
            ← Volver
          </a>
          <span className="text-base font-semibold text-gray-900 truncate">
            Presupuesto #{budget.budget_number}
          </span>
          {dirty && <span className="text-xs text-gray-400 shrink-0">Sin guardar</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleGeneratePDF}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">

        {/* Cabecera del presupuesto */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Datos del presupuesto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Cliente</label>
              <input
                type="text"
                value={budget.client_name}
                onChange={e => updateBudgetField('client_name', e.target.value)}
                placeholder="Nombre del cliente"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Email del cliente</label>
              <input
                type="email"
                value={budget.client_email}
                onChange={e => updateBudgetField('client_email', e.target.value)}
                placeholder="cliente@email.com"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Fecha</label>
              <input
                type="date"
                value={budget.issued_date}
                onChange={e => updateBudgetField('issued_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Validez (días)</label>
              <input
                type="number"
                value={budget.valid_days}
                min={1}
                onChange={e => updateBudgetField('valid_days', Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Nº presupuesto</label>
              <input
                type="text"
                value={budget.budget_number}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
              />
            </div>
          </div>
        </section>

        {/* Tabla de partidas */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-3 py-3 font-medium text-gray-500">Descripción</th>
                  <th className="px-3 py-3 font-medium text-gray-500 whitespace-nowrap">Ud.</th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-right whitespace-nowrap">Cantidad</th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-right whitespace-nowrap">P. Unit.</th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-right whitespace-nowrap">Total</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleItems.map(item => (
                  <tr
                    key={item.id}
                    className={item.confidence === 'baja'
                      ? 'bg-yellow-50 border-l-4 border-yellow-400'
                      : ''}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Descripción"
                        className="w-full min-w-[160px] bg-transparent px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={e => updateItem(item.id, 'unit', e.target.value)}
                        placeholder="ud"
                        className="w-14 bg-transparent px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        min={0}
                        step="any"
                        onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="w-20 bg-transparent px-1 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        min={0}
                        step="any"
                        onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                        className="w-24 bg-transparent px-1 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                      {fmt(item.total)} €
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        aria-label="Eliminar partida"
                        className="flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              + Añadir partida
            </button>
          </div>
        </section>

        {/* Totales */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{fmt(subtotal)} €</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IGIC ({budget.tax_rate}%)</span>
              <span>{fmt(taxAmount)} €</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 text-base pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{fmt(totalAmount)} €</span>
            </div>
          </div>
        </section>

        {saveError && (
          <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {saveError}
          </p>
        )}

        {/* Botones móvil */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-gray-900 px-4 py-4 text-base font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={handleGeneratePDF}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Generar PDF
          </button>
        </div>

      </div>
    </main>
  )
}
