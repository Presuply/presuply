import { renderToStream } from '@react-pdf/renderer'
import PresupuestoPDF from '@/components/PresupuestoPDF'
import type { PDFLineItem, PDFChapter, PDFTotals } from '@/components/PresupuestoPDF'
import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export async function generateBudgetPdf(
  budgetId: string,
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string,
): Promise<Buffer> {
  const [budgetRes, itemsRes, chaptersRes, profileRes] = await Promise.all([
    supabase.from('budgets').select('*').eq('id', budgetId).eq('user_id', userId).single(),
    supabase.from('line_items').select('*').eq('budget_id', budgetId).order('position'),
    supabase.from('chapters').select('*').eq('budget_id', budgetId).order('position'),
    supabase.from('profiles').select('*').eq('id', userId).single(),
  ])

  const b = budgetRes.data
  const items = itemsRes.data ?? []
  const chapters = chaptersRes.data ?? []
  const p = profileRes.data

  if (!b) throw new Error('Presupuesto no encontrado')

  const subtotal = items.reduce((sum, i) => sum + Number(i.total), 0)
  const overhead = b.overhead_enabled ? subtotal * (Number(b.overhead_rate) / 100) : 0
  const profit = b.profit_enabled ? (subtotal + overhead) * (Number(b.profit_rate) / 100) : 0
  const extras = Number(b.extras_amount) || 0
  const baseImponible = subtotal + overhead + profit + extras
  const taxAmount = baseImponible * (Number(b.tax_rate) / 100)
  const total = baseImponible + taxAmount

  let signedLogoUrl: string | null = null
  if (p?.logo_url) {
    try {
      const { data: signedData } = await supabase.storage
        .from('logos')
        .createSignedUrl(p.logo_url, 120)
      if (signedData?.signedUrl) {
        const imgRes = await fetch(signedData.signedUrl)
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer()
          const imgBase64 = Buffer.from(imgBuffer).toString('base64')
          const imgType = imgRes.headers.get('content-type') ?? 'image/jpeg'
          signedLogoUrl = `data:${imgType};base64,${imgBase64}`
        }
      }
    } catch {
      // Logo no disponible
    }
  }

  const pdfProps = {
    company: {
      name: p?.company_name || p?.full_name || '',
      nif: p?.nif || '',
      address: p?.address || '',
      phone: p?.phone || '',
      email: userEmail ?? '',
      iban: p?.iban || '',
    },
    client: {
      name: b.client_name || '',
      nif: b.client_nif || '',
      address: b.client_address || '',
      phone: b.client_phone || '',
      email: b.client_email || '',
    },
    budget: {
      ref: b.invoice_number || `#${b.budget_number}`,
      date: fmtDate(b.issued_date),
      validDays: b.valid_days ?? 30,
      title: (b as { title?: string | null }).title ?? null,
    },
    chapters: (chapters as PDFChapter[]),
    lineItems: items.map(i => ({
      id: i.id,
      chapter_id: i.chapter_id ?? null,
      description: i.description,
      unit: i.unit ?? '',
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      total: Number(i.total),
      descripcion_extendida: (i as { descripcion_extendida?: string | null }).descripcion_extendida ?? null,
      titulo_partida: (i as { titulo_partida?: string | null }).titulo_partida ?? null,
    })) as PDFLineItem[],
    totals: {
      subtotal, overhead, overheadRate: Number(b.overhead_rate), overheadEnabled: !!b.overhead_enabled,
      profit, profitRate: Number(b.profit_rate), profitEnabled: !!b.profit_enabled,
      extras, extrasDesc: b.extras_description || '',
      baseImponible, taxType: b.tax_type || 'IGIC', taxRate: Number(b.tax_rate), taxAmount, total,
    } as PDFTotals,
    show_iban: !!(b.show_iban && p?.iban),
    show_signature: !!b.show_signature,
    signedLogoUrl,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(React.createElement(PresupuestoPDF, pdfProps) as any)
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
