export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres un experto en maquetación de presupuestos de construcción en España. Recibes una plantilla de presupuesto existente y los datos de un nuevo presupuesto. Tu tarea es generar HTML completo (con CSS inline) que imite exactamente la estructura y disposición de la plantilla, sustituyendo los datos antiguos por los nuevos.

REGLAS:
1. Analiza la plantilla: identifica la disposición (columnas de datos, tabla de partidas, resumen de precios, pie de página)
2. Reproduce esa misma estructura en HTML con CSS inline
3. Sustituye TODOS los datos de la plantilla por los datos nuevos
4. Mantén el mismo orden de secciones y campos
5. Usa los mismos estilos visuales aproximados (negrita donde había negrita, tablas donde había tablas, dos columnas donde había dos columnas)
6. El HTML debe estar listo para imprimir en A4
7. Devuelve SOLO el HTML completo desde <!DOCTYPE html> hasta </html>, sin explicaciones ni marcas de código

DATOS DEL PRESUPUESTO que recibirás en JSON:
- empresa: nombre, nif, dirección, teléfono, email, iban
- cliente: nombre, nif, dirección, teléfono, email
- presupuesto: número, fecha, validez, título
- partidas: descripción, unidad, cantidad, precio_unitario, total
- resumen: subtotal, gastos_generales, beneficio_industrial, extras, base_imponible, tipo_impuesto, porcentaje_impuesto, impuesto, total_final`

// Edge-compatible base64 encoding
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function generateFallbackHtml(data: {
  company: { name: string; nif: string; address: string; phone: string; email: string; iban: string }
  client: { name: string; nif: string; address: string; phone: string; email: string }
  budget: { ref: string; date: string; validDays: number }
  lineItems: Array<{ description: string; unit: string; quantity: number; unit_price: number; total: number }>
  totals: { subtotal: number; overhead: number; overheadRate: number; overheadEnabled: boolean; profit: number; profitRate: number; profitEnabled: boolean; extras: number; extrasDesc: string; baseImponible: number; taxType: string; taxRate: number; taxAmount: number; total: number }
}): string {
  const { company, client, budget, lineItems, totals } = data

  const itemRows = lineItems.map(i => `
    <tr>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;">${i.description}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;text-align:center;">${i.unit || '—'}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;text-align:right;">${fmt(i.quantity)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;text-align:right;">${fmt(i.unit_price)} €</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;text-align:right;font-weight:500;">${fmt(i.total)} €</td>
    </tr>`).join('')

  const summaryRows = [
    `<tr><td style="padding:4px 10px;font-size:9.5pt;">Presupuesto de ejecución material</td><td style="padding:4px 10px;font-size:9.5pt;text-align:right;">${fmt(totals.subtotal)} €</td></tr>`,
    totals.overheadEnabled ? `<tr><td style="padding:4px 10px;font-size:9.5pt;">Gastos generales (${totals.overheadRate}%)</td><td style="padding:4px 10px;font-size:9.5pt;text-align:right;">${fmt(totals.overhead)} €</td></tr>` : '',
    totals.profitEnabled ? `<tr><td style="padding:4px 10px;font-size:9.5pt;">Beneficio industrial (${totals.profitRate}%)</td><td style="padding:4px 10px;font-size:9.5pt;text-align:right;">${fmt(totals.profit)} €</td></tr>` : '',
    totals.extras > 0 ? `<tr><td style="padding:4px 10px;font-size:9.5pt;">${totals.extrasDesc || 'Extras'}</td><td style="padding:4px 10px;font-size:9.5pt;text-align:right;">${fmt(totals.extras)} €</td></tr>` : '',
    `<tr style="border-top:1px solid #6b7280;"><td style="padding:5px 10px;font-size:9.5pt;font-weight:600;">Suma</td><td style="padding:5px 10px;font-size:9.5pt;text-align:right;font-weight:600;">${fmt(totals.baseImponible)} €</td></tr>`,
    `<tr><td style="padding:4px 10px;font-size:9.5pt;">${totals.taxType} (${totals.taxRate}%)</td><td style="padding:4px 10px;font-size:9.5pt;text-align:right;">${fmt(totals.taxAmount)} €</td></tr>`,
    `<tr style="border-top:2px solid #111827;"><td style="padding:6px 10px;font-size:11pt;font-weight:700;">TOTAL</td><td style="padding:6px 10px;font-size:11pt;text-align:right;font-weight:700;">${fmt(totals.total)} €</td></tr>`,
  ].filter(Boolean).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Presupuesto ${budget.ref}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111827; background: white; }
    @media print {
      @page { margin: 15mm; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Título -->
  <div style="text-align:center;margin-bottom:8mm;">
    <h1 style="font-size:15pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
      PRESUPUESTO ${budget.ref}
    </h1>
    <p style="font-size:9.5pt;color:#6b7280;margin-top:3px;">
      Fecha: ${budget.date} &nbsp;·&nbsp; Válido ${budget.validDays} días
    </p>
  </div>

  <!-- Dos columnas: empresa | cliente -->
  <div style="display:flex;gap:16px;margin-bottom:8mm;">
    <div style="flex:1;border:1px solid #d1d5db;padding:10px;">
      <p style="font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #d1d5db;padding-bottom:4px;margin-bottom:6px;">Datos del contratista</p>
      ${company.name ? `<p style="font-weight:600;font-size:9.5pt;">${company.name}</p>` : ''}
      ${company.nif ? `<p style="font-size:9pt;">NIF/CIF: ${company.nif}</p>` : ''}
      ${company.address ? `<p style="font-size:9pt;">${company.address}</p>` : ''}
      ${company.phone ? `<p style="font-size:9pt;">Tel: ${company.phone}</p>` : ''}
      ${company.email ? `<p style="font-size:9pt;">${company.email}</p>` : ''}
    </div>
    <div style="flex:1;border:1px solid #d1d5db;padding:10px;">
      <p style="font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #d1d5db;padding-bottom:4px;margin-bottom:6px;">Datos del cliente</p>
      ${client.name ? `<p style="font-weight:600;font-size:9.5pt;">${client.name}</p>` : '<p style="font-size:9pt;color:#9ca3af;">Sin datos de cliente</p>'}
      ${client.nif ? `<p style="font-size:9pt;">NIF/CIF: ${client.nif}</p>` : ''}
      ${client.address ? `<p style="font-size:9pt;">${client.address}</p>` : ''}
      ${client.phone ? `<p style="font-size:9pt;">Tel: ${client.phone}</p>` : ''}
      ${client.email ? `<p style="font-size:9pt;">${client.email}</p>` : ''}
    </div>
  </div>

  <!-- Tabla de partidas -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:8mm;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="padding:6px 8px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:left;border-bottom:2px solid #d1d5db;">Descripción</th>
        <th style="padding:6px 8px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:center;border-bottom:2px solid #d1d5db;white-space:nowrap;">Uds.</th>
        <th style="padding:6px 8px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:right;border-bottom:2px solid #d1d5db;white-space:nowrap;">Cantidad</th>
        <th style="padding:6px 8px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:right;border-bottom:2px solid #d1d5db;white-space:nowrap;">Precio/ud.</th>
        <th style="padding:6px 8px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:right;border-bottom:2px solid #d1d5db;white-space:nowrap;">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Resumen de precios -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:10mm;">
    <table style="width:55%;border-collapse:collapse;border:1px solid #d1d5db;">
      ${summaryRows}
    </table>
  </div>

  <!-- IBAN al pie si existe -->
  ${company.iban ? `
  <div style="border-top:1px solid #d1d5db;padding-top:6px;font-size:8.5pt;color:#6b7280;">
    Forma de pago — Transferencia bancaria: <strong>${company.iban}</strong>
  </div>` : ''}
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { budgetId } = await request.json()
    if (!budgetId) return NextResponse.json({ error: 'budgetId requerido' }, { status: 400 })

    // Cargar presupuesto, partidas y perfil en paralelo
    const [budgetRes, itemsRes, profileRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('id', budgetId).eq('user_id', user.id).single(),
      supabase.from('line_items').select('*').eq('budget_id', budgetId).order('position'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    const b = budgetRes.data
    const items = itemsRes.data ?? []
    const p = profileRes.data

    if (!b) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

    // Calcular totales
    const subtotal = items.reduce((sum, i) => sum + Number(i.total), 0)
    const overhead = b.overhead_enabled ? subtotal * (Number(b.overhead_rate) / 100) : 0
    const profit = b.profit_enabled ? (subtotal + overhead) * (Number(b.profit_rate) / 100) : 0
    const extras = Number(b.extras_amount) || 0
    const baseImponible = subtotal + overhead + profit + extras
    const taxAmount = baseImponible * (Number(b.tax_rate) / 100)
    const total = baseImponible + taxAmount

    const budgetData = {
      company: {
        name: p?.company_name || p?.full_name || '',
        nif: p?.nif || '',
        address: p?.address || '',
        phone: p?.phone || '',
        email: user.email || '',
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
      },
      lineItems: items.map(i => ({
        description: i.description,
        unit: i.unit ?? '',
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        total: Number(i.total),
      })),
      totals: {
        subtotal,
        overhead,
        overheadRate: Number(b.overhead_rate),
        overheadEnabled: !!b.overhead_enabled,
        profit,
        profitRate: Number(b.profit_rate),
        profitEnabled: !!b.profit_enabled,
        extras,
        extrasDesc: b.extras_description || '',
        baseImponible,
        taxType: b.tax_type || 'IGIC',
        taxRate: Number(b.tax_rate),
        taxAmount,
        total,
      },
    }

    // Sin plantilla → HTML de fallback, sin llamar a Claude
    if (!p?.template_url) {
      return NextResponse.json({ html: generateFallbackHtml(budgetData) })
    }

    // Con plantilla → descargar y enviar a Claude
    const { data: signedData } = await supabase.storage
      .from('logos')
      .createSignedUrl(p.template_url, 60)

    if (!signedData?.signedUrl) {
      return NextResponse.json({ html: generateFallbackHtml(budgetData) })
    }

    const templateResponse = await fetch(signedData.signedUrl)
    if (!templateResponse.ok) {
      return NextResponse.json({ html: generateFallbackHtml(budgetData) })
    }

    const buffer = await templateResponse.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    const contentType = templateResponse.headers.get('content-type') ?? ''
    const isPdf = contentType.includes('pdf') || p.template_url.endsWith('.pdf')

    const templateBlock: Anthropic.ContentBlockParam = isPdf
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        } as unknown as Anthropic.ContentBlockParam
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(contentType.split(';')[0].trim())
              ? contentType.split(';')[0].trim()
              : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const claudeResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8096,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          templateBlock,
          {
            type: 'text',
            text: `Genera el HTML del presupuesto con los siguientes datos:\n\n${JSON.stringify(budgetData, null, 2)}\n\nLa plantilla de referencia está adjunta. Imita su estructura exactamente y reemplaza todos los datos por los nuevos.`,
          },
        ],
      }],
    })

    const usage = claudeResponse.usage as Anthropic.Usage & {
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    console.log('PDF HTML tokens:', JSON.stringify({
      input: usage.input_tokens,
      output: usage.output_tokens,
      cache_creation: usage.cache_creation_input_tokens ?? 0,
      cache_read: usage.cache_read_input_tokens ?? 0,
    }))

    const rawHtml = claudeResponse.content[0]?.type === 'text' ? claudeResponse.content[0].text : ''
    const cleaned = rawHtml
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    // Inyectar CSS de impresión para eliminar encabezados del navegador,
    // independientemente de lo que Claude haya generado
    const printCss = `<style>
@media print {
  @page { margin: 15mm; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>`
    const html = cleaned.includes('</head>')
      ? cleaned.replace('</head>', `${printCss}\n</head>`)
      : cleaned.replace('</body>', `${printCss}\n</body>`)

    return NextResponse.json({ html })

  } catch (error) {
    console.error('Error en /api/generate-pdf-html:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
