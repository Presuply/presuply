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
  client_address: string
  client_phone: string
  client_nif: string
  budget_number: number
  tax_type: 'IGIC' | 'IVA'
  tax_rate: number
  valid_days: number
  issued_date: string
  invoice_number: string
  overhead_enabled: boolean
  overhead_rate: number
  profit_enabled: boolean
  profit_rate: number
  extras_description: string
  extras_amount: number
}

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const inputClass =
  'w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-[#FF6A00] transition-colors'

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const [budget, setBudget] = useState<BudgetHeader>({
    client_name: '',
    client_email: '',
    client_address: '',
    client_phone: '',
    client_nif: '',
    budget_number: 0,
    tax_type: 'IGIC',
    tax_rate: 7,
    valid_days: 30,
    issued_date: new Date().toISOString().slice(0, 10),
    invoice_number: '',
    overhead_enabled: false,
    overhead_rate: 13,
    profit_enabled: false,
    profit_rate: 6,
    extras_description: '',
    extras_amount: 0,
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

      if (b.pdf_url) setPdfUrl(b.pdf_url)

      setBudget({
        client_name: b.client_name ?? '',
        client_email: b.client_email ?? '',
        client_address: b.client_address ?? '',
        client_phone: b.client_phone ?? '',
        client_nif: b.client_nif ?? '',
        budget_number: b.budget_number,
        tax_type: (b.tax_type === 'IVA' ? 'IVA' : 'IGIC') as 'IGIC' | 'IVA',
        tax_rate: Number(b.tax_rate),
        valid_days: b.valid_days ?? 30,
        issued_date: b.issued_date ?? new Date().toISOString().slice(0, 10),
        invoice_number: b.invoice_number ?? '',
        overhead_enabled: b.overhead_enabled ?? false,
        overhead_rate: Number(b.overhead_rate) || 13,
        profit_enabled: b.profit_enabled ?? false,
        profit_rate: Number(b.profit_rate) || 6,
        extras_description: b.extras_description ?? '',
        extras_amount: Number(b.extras_amount) || 0,
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
  const overhead = budget.overhead_enabled ? subtotal * (budget.overhead_rate / 100) : 0
  const profit = budget.profit_enabled ? (subtotal + overhead) * (budget.profit_rate / 100) : 0
  const extras = budget.extras_amount || 0
  const baseImponible = subtotal + overhead + profit + extras
  const taxAmount = baseImponible * (budget.tax_rate / 100)
  const totalAmount = baseImponible + taxAmount

  // ── Helpers de estado ──────────────────────────────────────────────────────
  function markDirty() {
    setDirty(true)
    setLastChange(Date.now())
  }

  function updateBudgetField<K extends keyof BudgetHeader>(key: K, value: BudgetHeader[K]) {
    setBudget(prev => ({ ...prev, [key]: value }))
    markDirty()
  }

  function handleTaxTypeChange(taxType: 'IGIC' | 'IVA') {
    setBudget(prev => ({ ...prev, tax_type: taxType, tax_rate: taxType === 'IGIC' ? 7 : 21 }))
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
        client_address: budget.client_address || null,
        client_phone: budget.client_phone || null,
        client_nif: budget.client_nif || null,
        tax_type: budget.tax_type,
        tax_rate: budget.tax_rate,
        valid_days: budget.valid_days,
        issued_date: budget.issued_date,
        invoice_number: budget.invoice_number || null,
        overhead_enabled: budget.overhead_enabled,
        overhead_rate: budget.overhead_rate,
        profit_enabled: budget.profit_enabled,
        profit_rate: budget.profit_rate,
        extras_description: budget.extras_description || null,
        extras_amount: budget.extras_amount,
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

    for (const item of lineItems.filter(i => i._deleted && !i._isNew)) {
      await supabase.from('line_items').delete().eq('id', item.id)
    }

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

  const handleSaveRef = useRef(handleSave)
  useEffect(() => { handleSaveRef.current = handleSave })

  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => handleSaveRef.current(), 30000)
    return () => clearTimeout(timer)
  }, [lastChange, dirty])

  async function handleGeneratePDF() {
    setGeneratingPdf(true)
    setSaveError(null)

    try {
      // 1. Obtener HTML del presupuesto
      const res = await fetch('/api/generate-pdf-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetId: id }),
      })
      if (!res.ok) throw new Error('Error al generar el HTML')
      const { html } = await res.json()

      // 2. Extraer estilos y contenido del <body> para inyectar en el DOM
      const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? []
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      const bodyContent = bodyMatch ? bodyMatch[1] : html

      // 3. Contenedor fuera de pantalla — 794px = A4 a 96dpi
      const container = document.createElement('div')
      container.style.cssText =
        'position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,sans-serif;'
      container.innerHTML = styleBlocks.join('\n') + bodyContent
      document.body.appendChild(container)

      // 4. Capturar con html2canvas
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
      })
      document.body.removeChild(container)

      // 5. Construir PDF A4 con paginación automática
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()   // 210 mm
      const pdfPageHeight = pdf.internal.pageSize.getHeight() // 297 mm
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
      let heightLeft = imgHeight - pdfPageHeight
      let page = 1
      while (heightLeft > 0) {
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, -(pdfPageHeight * page), imgWidth, imgHeight)
        heightLeft -= pdfPageHeight
        page++
      }

      const blob = pdf.output('blob')

      // 6. Subir a Supabase Storage
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión')

      const storagePath = `${user.id}/${id}.pdf`
      await supabase.storage.from('pdfs').upload(storagePath, blob, {
        upsert: true,
        contentType: 'application/pdf',
      })

      // 7. Guardar ruta en el presupuesto
      await supabase.from('budgets').update({ pdf_url: storagePath }).eq('id', id)
      setPdfUrl(storagePath)

      // 8. Descarga automática desde el blob local (sin nueva petición a Storage)
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `presupuesto-${budget.budget_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)

    } catch (err) {
      console.error('Error generando PDF:', err)
      setSaveError('No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleDownloadPDF() {
    if (!pdfUrl) return
    const supabase = createClient()
    const { data } = await supabase.storage.from('pdfs').createSignedUrl(pdfUrl, 60)
    if (!data?.signedUrl) return
    // Fetch y descarga como blob para forzar descarga en vez de abrir en el navegador
    const response = await fetch(data.signedUrl)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `presupuesto-${budget.budget_number}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center">
        <p className="text-sm text-[#A9B5C2] italic">Cargando presupuesto...</p>
      </main>
    )
  }

  const lbl = 'block text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2]'
  const sec = 'bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm p-4 sm:p-6 space-y-4'
  const secTitle = 'text-xs font-bold text-[#6B7B8C] dark:text-[#A9B5C2] uppercase tracking-wider'
  const inlineInput = 'bg-transparent text-[#0D1B2A] dark:text-[#F4F6F9] px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6A00] rounded transition-colors'

  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A]">

      {/* Barra superior */}
      <div className="bg-white dark:bg-[#1B2A3A] border-b border-[#D5DCE4] dark:border-[#3A4A5C] px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/dashboard" className="text-[#6B7B8C] hover:text-[#FF6A00] text-sm transition-colors shrink-0">
            ← Volver
          </a>
          <span className="text-base font-bold text-[#0D1B2A] dark:text-[#F4F6F9] truncate">
            Presupuesto #{budget.budget_number}
          </span>
          {dirty && <span className="text-xs text-[#A9B5C2] shrink-0">Sin guardar</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={pdfUrl ? handleDownloadPDF : handleGeneratePDF}
            disabled={generatingPdf}
            className="border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-3 py-2 text-sm font-medium disabled:opacity-40 transition-colors">
            {generatingPdf ? 'Generando...' : pdfUrl ? 'Descargar PDF' : 'PDF'}
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2 text-sm disabled:opacity-40 transition-colors">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">

        {/* Datos del presupuesto */}
        <section className={sec}>
          <h2 className={secTitle}>Datos del presupuesto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={lbl}>Fecha</label>
              <input type="date" value={budget.issued_date}
                onChange={e => updateBudgetField('issued_date', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Validez (días)</label>
              <input type="number" value={budget.valid_days} min={1}
                onChange={e => updateBudgetField('valid_days', Number(e.target.value))} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Nº presupuesto (auto)</label>
              <input type="text" value={budget.budget_number} disabled
                className="w-full bg-[#EDF0F4] dark:bg-[#3A4A5C] border border-[#D5DCE4] dark:border-[#3A4A5C] rounded-[8px] px-3 py-2 text-sm text-[#A9B5C2]" />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Nº factura / referencia</label>
              <input type="text" value={budget.invoice_number}
                onChange={e => updateBudgetField('invoice_number', e.target.value)}
                placeholder="Ej. 26/001" className={inputClass} />
            </div>
          </div>
        </section>

        {/* Datos del cliente */}
        <section className={sec}>
          <h2 className={secTitle}>Datos del cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={lbl}>Nombre / empresa</label>
              <input type="text" value={budget.client_name}
                onChange={e => updateBudgetField('client_name', e.target.value)}
                placeholder="Nombre del cliente" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>NIF / CIF</label>
              <input type="text" value={budget.client_nif}
                onChange={e => updateBudgetField('client_nif', e.target.value)}
                placeholder="12345678A" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Email</label>
              <input type="email" value={budget.client_email}
                onChange={e => updateBudgetField('client_email', e.target.value)}
                placeholder="cliente@email.com" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Teléfono</label>
              <input type="tel" value={budget.client_phone}
                onChange={e => updateBudgetField('client_phone', e.target.value)}
                placeholder="600 000 000" className={inputClass} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={lbl}>Dirección</label>
              <input type="text" value={budget.client_address}
                onChange={e => updateBudgetField('client_address', e.target.value)}
                placeholder="Calle, número, localidad" className={inputClass} />
            </div>
          </div>
        </section>

        {/* Tabla de partidas */}
        <section className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D5DCE4] dark:border-[#3A4A5C] bg-[#F4F6F9] dark:bg-[#0D1B2A] text-left">
                  <th className="px-3 py-3 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2]">Descripción</th>
                  <th className="px-3 py-3 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] whitespace-nowrap">Ud.</th>
                  <th className="px-3 py-3 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] text-right whitespace-nowrap">Cantidad</th>
                  <th className="px-3 py-3 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] text-right whitespace-nowrap">P. Unit.</th>
                  <th className="px-3 py-3 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] text-right whitespace-nowrap">Total</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5DCE4] dark:divide-[#3A4A5C]">
                {visibleItems.map(item => (
                  <tr key={item.id}
                    className={item.confidence === 'baja'
                      ? 'bg-[#F5A623]/10 border-l-4 border-[#F5A623]'
                      : 'bg-white dark:bg-[#1B2A3A]'}>
                    <td className="px-3 py-2">
                      <input type="text" value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Descripción"
                        className={`w-full min-w-[160px] ${inlineInput}`} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={item.unit}
                        onChange={e => updateItem(item.id, 'unit', e.target.value)}
                        placeholder="ud"
                        className={`w-14 ${inlineInput}`} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={item.quantity} min={0} step="any"
                        onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className={`w-20 text-right ${inlineInput}`} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={item.unit_price} min={0} step="any"
                        onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                        className={`w-24 text-right ${inlineInput}`} />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] whitespace-nowrap">
                      {fmt(item.total)} €
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => deleteItem(item.id)} aria-label="Eliminar partida"
                        className="flex items-center justify-center w-6 h-6 rounded-full text-[#A9B5C2] hover:text-[#E5484D] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#D5DCE4] dark:border-[#3A4A5C]">
            <button type="button" onClick={addItem}
              className="text-sm font-semibold text-[#FF6A00] hover:text-[#FF9248] transition-colors">
              + Añadir partida
            </button>
          </div>
        </section>

        {/* Impuesto y costes adicionales */}
        <section className={sec}>
          <h2 className={secTitle}>Impuesto y costes adicionales</h2>

          <div className="space-y-1">
            <label className={lbl}>Tipo de impuesto</label>
            <div className="flex gap-4">
              {(['IGIC', 'IVA'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tax_type" value={t}
                    checked={budget.tax_type === t}
                    onChange={() => handleTaxTypeChange(t)}
                    className="accent-[#FF6A00]" />
                  <span className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9]">
                    {t} ({t === 'IGIC' ? '7' : '21'}%)
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="overhead" checked={budget.overhead_enabled}
              onChange={e => updateBudgetField('overhead_enabled', e.target.checked)}
              className="accent-[#FF6A00] w-4 h-4" />
            <label htmlFor="overhead" className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9] flex-1 cursor-pointer">
              Gastos generales
            </label>
            <div className="flex items-center gap-1">
              <input type="number" value={budget.overhead_rate} min={0} max={100} step="0.01"
                disabled={!budget.overhead_enabled}
                onChange={e => updateBudgetField('overhead_rate', Number(e.target.value))}
                className="w-20 bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] rounded-[8px] px-2 py-1.5 text-sm text-right disabled:opacity-40 focus:outline-none focus:border-[#FF6A00] transition-colors" />
              <span className="text-sm text-[#6B7B8C]">%</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="profit" checked={budget.profit_enabled}
              onChange={e => updateBudgetField('profit_enabled', e.target.checked)}
              className="accent-[#FF6A00] w-4 h-4" />
            <label htmlFor="profit" className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9] flex-1 cursor-pointer">
              Beneficio industrial
            </label>
            <div className="flex items-center gap-1">
              <input type="number" value={budget.profit_rate} min={0} max={100} step="0.01"
                disabled={!budget.profit_enabled}
                onChange={e => updateBudgetField('profit_rate', Number(e.target.value))}
                className="w-20 bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] rounded-[8px] px-2 py-1.5 text-sm text-right disabled:opacity-40 focus:outline-none focus:border-[#FF6A00] transition-colors" />
              <span className="text-sm text-[#6B7B8C]">%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className={lbl}>Extras fuera de presupuesto (descripción)</label>
              <input type="text" value={budget.extras_description}
                onChange={e => updateBudgetField('extras_description', e.target.value)}
                placeholder="Ej. Gestión de residuos" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Importe (€)</label>
              <input type="number" value={budget.extras_amount} min={0} step="0.01"
                onChange={e => updateBudgetField('extras_amount', Number(e.target.value))}
                className={inputClass} />
            </div>
          </div>
        </section>

        {/* Resumen de precios */}
        <section className={sec}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
              <span>Presupuesto de ejecución material</span>
              <span>{fmt(subtotal)} €</span>
            </div>
            {budget.overhead_enabled && (
              <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
                <span>Gastos generales ({budget.overhead_rate}%)</span>
                <span>{fmt(overhead)} €</span>
              </div>
            )}
            {budget.profit_enabled && (
              <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
                <span>Beneficio industrial ({budget.profit_rate}%)</span>
                <span>{fmt(profit)} €</span>
              </div>
            )}
            {extras > 0 && (
              <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
                <span>{budget.extras_description || 'Extras'}</span>
                <span>{fmt(extras)} €</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] pt-1 border-t border-[#D5DCE4] dark:border-[#3A4A5C]">
              <span>Base imponible</span>
              <span>{fmt(baseImponible)} €</span>
            </div>
            <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
              <span>{budget.tax_type} ({budget.tax_rate}%)</span>
              <span>{fmt(taxAmount)} €</span>
            </div>
            <div className="flex justify-between font-bold text-[#0D1B2A] dark:text-[#F4F6F9] text-base pt-2 border-t border-[#D5DCE4] dark:border-[#3A4A5C]">
              <span>Total</span>
              <span>{fmt(totalAmount)} €</span>
            </div>
          </div>
        </section>

        {saveError && (
          <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
            {saveError}
          </p>
        )}

        {/* Botones móvil */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 transition-colors">
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button type="button" onClick={pdfUrl ? handleDownloadPDF : handleGeneratePDF}
            disabled={generatingPdf}
            className="flex-1 bg-[#EDF0F4] dark:bg-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] hover:bg-[#D5DCE4] dark:hover:bg-[#4A5A6C] font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 transition-colors">
            {generatingPdf ? 'Generando PDF...' : pdfUrl ? 'Descargar PDF' : 'Generar PDF'}
          </button>
        </div>

      </div>
    </main>
  )
}
