export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-opus-4-7'
const MODEL_SONNET = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres un experto maquetador de documentos profesionales especializados en presupuestos de construcción y reformas en España. Tu tarea es generar HTML completo y autocontenido con CSS inline que produzca un presupuesto profesional de máxima calidad visual.

ANÁLISIS DE LA PLANTILLA:
Si recibes una imagen de plantilla del usuario, analiza:
- Disposición general (columnas de datos, márgenes, espaciado)
- Jerarquía visual (qué destaca, qué es secundario)
- Estilo tipográfico aproximado
- Presencia de líneas, bordes, separadores
Usa esa estructura como referencia, pero mejora la presentación visual: más limpieza, mejor tipografía, mejor uso del espacio. No copies pixel a pixel — interpreta y mejora.

Si no hay plantilla, genera un diseño propio profesional y limpio siguiendo las reglas de abajo.

REGLAS DE DISEÑO OBLIGATORIAS:
1. Tipografía: usa Arial, Helvetica o sans-serif del sistema. Nunca fuentes externas — el HTML debe funcionar sin conexión.
2. Página A4 (210mm × 297mm), márgenes 15mm por todos los lados.
3. Todo el CSS es inline — no uses <style> externo ni clases.
4. Paleta neutra y profesional: blanco, gris muy claro (#f8f8f8), gris medio (#666), negro suave (#1a1a1a). Si el usuario tiene color de marca, úsalo solo en la cabecera y acento.
5. El HTML debe empezar con <!DOCTYPE html> y terminar con </html>.
6. Nunca incluyas explicaciones, comentarios ni texto fuera del HTML.

ESTRUCTURA OBLIGATORIA DEL DOCUMENTO:

CABECERA (dos columnas):
- Izquierda: si hay logo, mostrarlo (máx 80px alto). Nombre de empresa en negrita 16px. NIF, dirección, teléfono, email en 11px gris.
- Derecha: 'PRESUPUESTO' en mayúsculas negrita 20px. Número de presupuesto, fecha de emisión, validez en días. Todo alineado a la derecha.
- Separador horizontal fino (#ddd) bajo la cabecera.

DATOS DEL CLIENTE (si los hay):
- Bloque 'DATOS DEL CLIENTE' con fondo gris muy claro (#f8f8f8), padding 8px, border-radius 4px.
- Nombre/razón social, NIF/CIF, dirección, teléfono, email.
- Solo mostrar los campos que tengan valor.

TABLA DE PARTIDAS (por capítulos):
- Cabecera de tabla: fondo #1a1a1a, texto blanco, 11px uppercase. Columnas: DESCRIPCIÓN (50%) | UDS. (10%) | PRECIO/UD. (18%) | TOTAL (22%)
- Por cada capítulo:
  * Fila de capítulo: fondo #f0f0f0, texto negrita 12px, nombre del capítulo a la izquierda, subtotal a la derecha.
  * Filas de partidas: fondo blanco y #fafafa alternado, 11px.
  * Números alineados a la derecha, separador decimal coma.
- Última fila: borde superior doble.

RESUMEN DE PRECIOS (alineado a la derecha, ancho 45%):
Mostrar solo las líneas con valor > 0:
  Presupuesto de ejecución material:   X.XXX,XX €
  Gastos generales X%:                 X.XXX,XX €  (si activado)
  Beneficio industrial X%:             X.XXX,XX €  (si activado)
  [descripción extras]:                X.XXX,XX €  (si > 0)
  ─────────────────────────────────────────────────
  Base imponible:                      X.XXX,XX €
  IGIC X% / IVA X%:                   X.XXX,XX €
  ═════════════════════════════════════════════════
  TOTAL:                               X.XXX,XX €  (negrita 14px)

CONDICIONES (si hay notas):
- Bloque con título 'CONDICIONES' en gris, texto 10px.

IBAN (solo si show_iban = true y hay IBAN):
- 'Número de cuenta (IBAN): XX XX XXXX...' en 10px gris.

FIRMA (solo si show_signature = true):
- Tres columnas: 'Lugar y fecha:', 'Firma del cliente:', 'Firma y sello:'
- Línea horizontal bajo cada una para firmar.
- Espacio de 40px sobre las líneas.

PIE DE PÁGINA:
- Línea separadora fina.
- Datos completos de la empresa en 9px gris centrado.
- Si hay varias páginas: 'Página X de Y' a la derecha.

FORMATO DE NÚMEROS:
- Siempre con separador de miles (punto) y decimal (coma): 1.234,56 €
- Nunca uses el formato anglosajón con punto decimal.

IDIOMA: Todo en español. Siempre.`

const EXPAND_SYSTEM_PROMPT = `Eres un experto en construcción y reformas en España. Recibes una lista de partidas de presupuesto con descripciones cortas escritas por un profesional.
Tu tarea es expandir cada descripción a texto técnico profesional completo, como aparecería en un presupuesto formal de construcción.

REGLAS ESTRICTAS:
- Mantén EXACTAMENTE la cantidad, unidad y precio del original — nunca los cambies
- Solo expande el campo 'descripcion'
- La descripción expandida debe incluir: tipo de material, marca si se puede inferir, especificaciones técnicas, método de colocación, incluyendo medios auxiliares
- Si la descripción ya es técnica y completa, devuélvela tal cual sin cambios
- Si no puedes inferir especificaciones, expande con términos genéricos profesionales del sector
- Devuelve SOLO JSON válido, sin texto adicional

Ejemplo:
Input: { "descripcion": "pladur cocina 30m2", "cantidad": 30, "unidad": "m²", "precio_unitario": 22, "total": 660 }
Output: { "descripcion": "Suministro y colocación de placa de yeso laminado tipo estándar de 13mm de espesor sobre estructura metálica galvanizada, incluyendo tratamiento de juntas con cinta y pasta, lijado y medios auxiliares. Medida la superficie ejecutada.", "cantidad": 30, "unidad": "m²", "precio_unitario": 22, "total": 660 }

Formato de respuesta — array JSON con las mismas partidas pero con descripciones expandidas:
[{ "descripcion": "...", "unidad": "...", "cantidad": 0, "precio_unitario": 0, "total": 0 }]`

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
  chapters: Array<{ id: string; name: string; position: number }>
  lineItems: Array<{ chapter_id: string | null; description: string; unit: string; quantity: number; unit_price: number; total: number }>
  totals: { subtotal: number; overhead: number; overheadRate: number; overheadEnabled: boolean; profit: number; profitRate: number; profitEnabled: boolean; extras: number; extrasDesc: string; baseImponible: number; taxType: string; taxRate: number; taxAmount: number; total: number }
  show_iban: boolean
  show_signature: boolean
}): string {
  const { company, client, budget, chapters, lineItems, totals, show_iban, show_signature } = data

  function renderItemRow(i: { description: string; unit: string; quantity: number; unit_price: number; total: number }) {
    return `
    <tr>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;">${i.description}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;text-align:center;">${i.unit || '—'}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;text-align:right;">${fmt(i.quantity)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;text-align:right;">${fmt(i.unit_price)} €</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9.5pt;text-align:right;font-weight:500;">${fmt(i.total)} €</td>
    </tr>`
  }

  let itemRows: string
  if (chapters.length > 0) {
    const sorted = [...chapters].sort((a, b) => a.position - b.position)
    const rows: string[] = []
    for (const ch of sorted) {
      const chItems = lineItems.filter(i => i.chapter_id === ch.id)
      if (chItems.length === 0) continue
      const chSubtotal = chItems.reduce((s, i) => s + i.total, 0)
      rows.push(`
    <tr style="background:#f3f4f6;">
      <td colspan="4" style="padding:6px 8px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">${ch.name}</td>
      <td style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:right;">${fmt(chSubtotal)} €</td>
    </tr>`)
      rows.push(...chItems.map(renderItemRow))
    }
    // items sin capítulo (presupuestos migrados)
    const orphans = lineItems.filter(i => !i.chapter_id || !chapters.find(c => c.id === i.chapter_id))
    if (orphans.length > 0) {
      rows.push(`
    <tr style="background:#f3f4f6;">
      <td colspan="5" style="padding:6px 8px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Sin capítulo</td>
    </tr>`)
      rows.push(...orphans.map(renderItemRow))
    }
    itemRows = rows.join('')
  } else {
    itemRows = lineItems.map(renderItemRow).join('')
  }

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

  <!-- IBAN -->
  ${show_iban && company.iban ? `
  <div style="margin-top:6mm;padding-top:5px;border-top:1px solid #ddd;font-size:9.5pt;color:#666;">
    Número de cuenta (IBAN): <strong>${company.iban}</strong>
  </div>` : ''}

  <!-- Sección de firma -->
  ${show_signature ? `
  <div style="margin-top:10mm;display:flex;gap:16px;">
    ${['Lugar y fecha:', 'Firma del cliente:', 'Firma y sello:'].map(label => `
    <div style="flex:1;text-align:center;">
      <div style="height:40px;"></div>
      <div style="border-top:1px solid #1a1a1a;padding-top:5px;font-size:9.5pt;color:#666;">${label}</div>
    </div>`).join('')}
  </div>` : ''}

  <!-- Pie de página -->
  <div style="margin-top:8mm;padding-top:5px;border-top:1px solid #ddd;font-size:9pt;color:#999;text-align:center;">
    ${[company.name, company.nif ? `NIF: ${company.nif}` : '', company.address, company.phone, company.email].filter(Boolean).join(' · ')}
  </div>
</body>
</html>`
}

type LineItemData = {
  chapter_id: string | null
  description: string
  unit: string
  quantity: number
  unit_price: number
  total: number
}

async function expandDescriptions(
  lineItems: LineItemData[],
  anthropic: Anthropic,
): Promise<LineItemData[]> {
  if (lineItems.length === 0) return lineItems
  try {
    const input = lineItems.map(i => ({
      descripcion: i.description,
      unidad: i.unit,
      cantidad: i.quantity,
      precio_unitario: i.unit_price,
      total: i.total,
    }))

    const response = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 4096,
      system: [{ type: 'text', text: EXPAND_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Expande las descripciones de estas partidas manteniendo todos los valores numéricos exactos: ${JSON.stringify(input)}`,
      }],
    })

    const usage = response.usage as Anthropic.Usage & {
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    console.log('Expand descriptions tokens:', JSON.stringify({
      input: usage.input_tokens,
      output: usage.output_tokens,
      cache_creation: usage.cache_creation_input_tokens ?? 0,
      cache_read: usage.cache_read_input_tokens ?? 0,
    }))

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const expanded = JSON.parse(cleaned) as Array<{ descripcion: string }>

    if (!Array.isArray(expanded) || expanded.length !== lineItems.length) return lineItems

    return lineItems.map((item, i) => ({
      ...item,
      description: expanded[i]?.descripcion ?? item.description,
    }))
  } catch {
    return lineItems // fallback seguro: usa descripciones originales
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { budgetId } = await request.json()
    if (!budgetId) return NextResponse.json({ error: 'budgetId requerido' }, { status: 400 })

    // Cargar presupuesto, partidas, capítulos y perfil en paralelo
    const [budgetRes, itemsRes, chaptersRes, profileRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('id', budgetId).eq('user_id', user.id).single(),
      supabase.from('line_items').select('*').eq('budget_id', budgetId).order('position'),
      supabase.from('chapters').select('*').eq('budget_id', budgetId).order('position'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    const b = budgetRes.data
    const items = itemsRes.data ?? []
    const chapters = chaptersRes.data ?? []
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
      show_iban: !!(b.show_iban && p?.iban),
      show_signature: !!b.show_signature,
      chapters: chapters.map(c => ({
        id: c.id,
        name: c.name,
        position: c.position,
      })),
      lineItems: items.map(i => ({
        chapter_id: i.chapter_id ?? null,
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

    // Crear cliente Anthropic una vez para Sonnet y Opus
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Paso 1: expandir descripciones con Sonnet (si está activado)
    const expandedLineItems = b.expand_descriptions !== false
      ? await expandDescriptions(budgetData.lineItems, anthropic)
      : budgetData.lineItems
    const finalBudgetData = { ...budgetData, lineItems: expandedLineItems }

    // Sin plantilla → HTML de fallback, sin llamar a Opus
    if (!p?.template_url) {
      return NextResponse.json({ html: generateFallbackHtml(finalBudgetData) })
    }

    // Con plantilla → descargar y enviar a Claude
    const { data: signedData } = await supabase.storage
      .from('logos')
      .createSignedUrl(p.template_url, 60)

    if (!signedData?.signedUrl) {
      return NextResponse.json({ html: generateFallbackHtml(finalBudgetData) })
    }

    const templateResponse = await fetch(signedData.signedUrl)
    if (!templateResponse.ok) {
      return NextResponse.json({ html: generateFallbackHtml(finalBudgetData) })
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
            text: `Genera el presupuesto profesional en HTML completo siguiendo las instrucciones del sistema.\n\nDATOS DEL PRESUPUESTO:\n${JSON.stringify(finalBudgetData, null, 2)}\n\nLa imagen adjunta es la plantilla del usuario. Úsala como referencia de estructura y mejora su presentación visual.\n\nDevuelve SOLO el HTML desde <!DOCTYPE html> hasta </html>.`,
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
