export const runtime = 'nodejs'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-sonnet-4-6'

const DECOMP_SYSTEM_PROMPT = `Eres un experto en presupuestos de construcción y reformas en España.
Para cada partida que recibas, genera la descomposición de precio en unidades básicas.
La suma de (rendimiento × precio) de todas las unidades básicas debe aproximarse al precio unitario dado.

REGLAS:
- Tipos válidos: MO (mano de obra), MAT (materiales), MQ (maquinaria)
- Usa entre 2 y 5 unidades básicas por partida
- El precio de cada unidad básica debe ser razonable para el sector de la construcción en España
- Los rendimientos deben ser realistas para la tarea descrita
- Devuelve SOLO JSON válido, sin texto adicional ni marcas de formato`

// ── Tipos ──────────────────────────────────────────────────────────────────

type UnidadBasica = {
  tipo: 'MO' | 'MAT' | 'MQ'
  codigo: string
  descripcion: string
  unidad: string
  rendimiento: number
  precio: number
}

type RawDBItem = {
  id: string
  chapter_id: string | null
  description: string
  unit: string | null
  quantity: number
  unit_price: number
  total: number
  position: number
  titulo_partida?: string | null
  descripcion_extendida?: string | null
}

type ItemWithCode = RawDBItem & {
  chapterCode: string
  itemCode: string
  unidades_basicas: UnidadBasica[]
}

type BC3Chapter = {
  id: string | null
  name: string
  code: string
}

// ── Helpers numéricos ──────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return n.toFixed(2)
}

// ── Sanitize para BC3 (ISO-8859-1, sin caracteres especiales del formato) ──

function sanitize(text: string): string {
  return (text ?? '')
    .replace(/€/g, 'EUR')
    .replace(/~/g, '-')
    .replace(/\|/g, ';')
    .replace(/\\/g, '/')
    .replace(/\r?\n|\r/g, ' ')
    .trim()
}

// ── Llamada a Sonnet para descomponer una partida ──────────────────────────

async function getDecomp(
  anthropic: Anthropic,
  item: { description: string; unit: string; unit_price: number },
): Promise<UnidadBasica[]> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: 'text', text: DECOMP_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Partida: ${item.description}
Precio unitario: ${fmtNum(item.unit_price)} €/${item.unit || 'ud'}

Responde SOLO con JSON:
{
  "unidades_basicas": [
    {
      "tipo": "MO|MAT|MQ",
      "descripcion": "nombre de la unidad básica",
      "unidad": "h|m²|kg|ud|ml|...",
      "rendimiento": 0.00,
      "precio": 0.00
    }
  ]
}`,
      }],
    })

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
    const firstBrace = cleaned.indexOf('{')
    if (firstBrace !== -1) cleaned = cleaned.slice(firstBrace)
    const lastBrace = cleaned.lastIndexOf('}')
    if (lastBrace !== -1) cleaned = cleaned.slice(0, lastBrace + 1)

    const parsed = JSON.parse(cleaned) as { unidades_basicas: UnidadBasica[] }
    return Array.isArray(parsed.unidades_basicas) ? parsed.unidades_basicas : []
  } catch {
    return []
  }
}

// ── Construcción del string BC3 ────────────────────────────────────────────

function buildBC3(
  companyName: string,
  budgetTitle: string,
  bc3Chapters: BC3Chapter[],
  items: ItemWithCode[],
): string {
  const lines: string[] = []

  // ~V — cabecera
  lines.push(`~V|FIEBDC-3|2004||||||${sanitize(companyName)}||`)

  // ~C — concepto raíz (la obra)
  lines.push(`~C|OBRA|PN|${sanitize(budgetTitle)}||`)

  // ~C — capítulos
  for (const ch of bc3Chapters) {
    lines.push(`~C|${ch.code}||${sanitize(ch.name)}||`)
  }

  // ~C — partidas
  for (const item of items) {
    const resumen = sanitize(item.titulo_partida ?? item.description)
    const unit = sanitize(item.unit ?? 'ud')
    lines.push(`~C|${item.itemCode}|${unit}|${resumen}|${fmtNum(item.unit_price)}|`)
  }

  // ~C — unidades básicas
  for (const item of items) {
    for (const ub of item.unidades_basicas) {
      lines.push(`~C|${ub.codigo}|${sanitize(ub.unidad)}|${sanitize(ub.descripcion)}|${fmtNum(ub.precio)}|`)
    }
  }

  // ~D — OBRA → capítulos
  const obraDecomp = bc3Chapters.map(ch => `${ch.code}\\1\\0\\`).join('')
  lines.push(`~D|OBRA|${obraDecomp}|`)

  // ~D — capítulos → partidas
  const itemsByChapterCode = new Map<string, ItemWithCode[]>()
  for (const item of items) {
    if (!itemsByChapterCode.has(item.chapterCode)) itemsByChapterCode.set(item.chapterCode, [])
    itemsByChapterCode.get(item.chapterCode)!.push(item)
  }
  for (const ch of bc3Chapters) {
    const chItems = itemsByChapterCode.get(ch.code) ?? []
    if (chItems.length === 0) continue
    const decomp = chItems
      .map(i => `${i.itemCode}\\${fmtNum(i.quantity)}\\${fmtNum(i.unit_price)}\\`)
      .join('')
    lines.push(`~D|${ch.code}|${decomp}|`)
  }

  // ~D — partidas → unidades básicas
  for (const item of items) {
    if (item.unidades_basicas.length === 0) continue
    const decomp = item.unidades_basicas
      .map(ub => `${ub.codigo}\\${fmtNum(ub.rendimiento)}\\${fmtNum(ub.precio)}\\`)
      .join('')
    lines.push(`~D|${item.itemCode}|${decomp}|`)
  }

  // ~T — descripción larga de cada partida
  for (const item of items) {
    const longDesc = item.descripcion_extendida || item.description
    if (longDesc) {
      lines.push(`~T|${item.itemCode}|${sanitize(longDesc)}|`)
    }
  }

  // ~X — fin de archivo
  lines.push('~X')

  return lines.join('\r\n')
}

// ── Handler principal ──────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { budgetId } = await request.json() as { budgetId: string }
    if (!budgetId) return NextResponse.json({ error: 'budgetId requerido' }, { status: 400 })

    // Cargar datos en paralelo
    const [budgetRes, itemsRes, chaptersRes, profileRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('id', budgetId).eq('user_id', user.id).single(),
      supabase.from('line_items').select('*').eq('budget_id', budgetId).order('position'),
      supabase.from('chapters').select('*').eq('budget_id', budgetId).order('position'),
      supabase.from('profiles').select('company_name, full_name').eq('id', user.id).single(),
    ])

    const budget = budgetRes.data
    const rawItems = (itemsRes.data ?? []) as RawDBItem[]
    const rawChapters = chaptersRes.data ?? []
    const profile = profileRes.data

    if (!budget) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

    const companyName = profile?.company_name || profile?.full_name || ''
    const budgetTitle = (budget as { title?: string | null }).title || `Presupuesto ${budget.budget_number}`

    // Construir lista de capítulos BC3 (reales + sintético para huérfanos)
    const sortedChapters = [...rawChapters].sort((a, b) => a.position - b.position)
    const orphanItems = rawItems.filter(i => !i.chapter_id || !rawChapters.find(c => c.id === i.chapter_id))
    const bc3Chapters: BC3Chapter[] = sortedChapters.map((ch, idx) => ({
      id: ch.id as string,
      name: ch.name as string,
      code: `CAP${String(idx + 1).padStart(2, '0')}`,
    }))

    if (orphanItems.length > 0) {
      bc3Chapters.push({
        id: null,
        name: 'General',
        code: `CAP${String(sortedChapters.length + 1).padStart(2, '0')}`,
      })
    }

    const chapterCodeById = new Map<string | null, string>()
    for (const ch of bc3Chapters) chapterCodeById.set(ch.id, ch.code)

    // Asignar códigos a cada partida
    const itemsWithCodes: Omit<ItemWithCode, 'unidades_basicas'>[] = []
    const itemCountByChapter = new Map<string, number>()

    for (const rawItem of rawItems.sort((a, b) => a.position - b.position)) {
      const effectiveChapterId = rawChapters.find(c => c.id === rawItem.chapter_id)
        ? rawItem.chapter_id
        : null  // orphan

      const chCode = chapterCodeById.get(effectiveChapterId) ?? bc3Chapters[0]?.code ?? 'CAP01'
      const count = (itemCountByChapter.get(chCode) ?? 0) + 1
      itemCountByChapter.set(chCode, count)

      itemsWithCodes.push({
        ...rawItem,
        chapter_id: effectiveChapterId,
        chapterCode: chCode,
        itemCode: `${chCode}P${String(count).padStart(3, '0')}`,
      })
    }

    // Llamar a Sonnet en batches de 10
    const BATCH_SIZE = 10
    const decomps: UnidadBasica[][] = new Array(itemsWithCodes.length).fill(null).map(() => [])
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    for (let i = 0; i < itemsWithCodes.length; i += BATCH_SIZE) {
      const batch = itemsWithCodes.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map(item => getDecomp(anthropic, {
          description: item.description,
          unit: item.unit ?? 'ud',
          unit_price: Number(item.unit_price),
        }))
      )
      results.forEach((r, j) => { decomps[i + j] = r })
    }

    console.log(`BC3 export: ${itemsWithCodes.length} partidas procesadas con Sonnet`)

    // Construir items finales con unidades básicas y sus códigos BC3
    const finalItems: ItemWithCode[] = itemsWithCodes.map((item, idx) => {
      const rawUBs = decomps[idx]
      const TIPOS_VALIDOS = new Set(['MO', 'MAT', 'MQ'])
      const unidades_basicas: UnidadBasica[] = rawUBs.map((ub, k) => ({
        tipo: TIPOS_VALIDOS.has(ub.tipo) ? ub.tipo : 'MAT',
        codigo: `${ub.tipo}_${item.itemCode}_${String(k + 1).padStart(2, '0')}`,
        descripcion: String(ub.descripcion ?? ''),
        unidad: String(ub.unidad ?? 'ud'),
        rendimiento: Number(ub.rendimiento) || 0,
        precio: Number(ub.precio) || 0,
      }))

      return { ...item, unidades_basicas }
    })

    // Construir y encodear el BC3
    const bc3String = buildBC3(companyName, budgetTitle, bc3Chapters, finalItems)
    const bc3Buffer = Buffer.from(bc3String, 'latin1')

    const safeClient = (budget.client_name ?? 'cliente')
      .replace(/[áàä]/gi, 'a').replace(/[éèë]/gi, 'e').replace(/[íìï]/gi, 'i')
      .replace(/[óòö]/gi, 'o').replace(/[úùü]/gi, 'u').replace(/[ñ]/gi, 'n')
      .replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 30)
    const filename = `${budget.budget_number}-${safeClient}.bc3`

    return new NextResponse(bc3Buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(bc3Buffer.length),
      },
    })

  } catch (error) {
    console.error('Error en /api/export-bc3:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
