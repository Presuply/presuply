export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres un experto en presupuestos de construcción y reformas en España.
Recibes la descripción breve de una partida de presupuesto escrita por un profesional.

Genera:
1. Un título corto y descriptivo (máx. 60 caracteres), que resuma la partida con precisión.
2. Una descripción extendida profesional y técnica. Máximo 4 líneas (no más de 400 caracteres). Sé conciso y técnico. Incluye materiales con características técnicas, proceso de ejecución y acabados.

Devuelve SOLO JSON, sin texto adicional:
{ "titulo": "...", "descripcion_extendida": "..." }

REGLAS:
- No inventes materiales o procesos que contradigan la descripción original.
- Las unidades de medida y cantidades nunca se mencionan en el texto.
- Todo en español, con vocabulario técnico de la construcción.`

// ── Expande una sola partida — falla silenciosamente con valores vacíos ──────

async function expandSingle(
  anthropic: Anthropic,
  item: { id: string; description: string },
): Promise<{ titulo: string; descripcion_extendida: string }> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Expande esta partida: ${item.description}`,
      }],
    })

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    let cleaned = ''
    try {
      cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim()
      const firstBrace = cleaned.indexOf('{')
      if (firstBrace !== -1) cleaned = cleaned.slice(firstBrace)
      const lastBrace = cleaned.lastIndexOf('}')
      if (lastBrace !== -1) cleaned = cleaned.slice(0, lastBrace + 1)
      const parsed = JSON.parse(cleaned) as { titulo?: string; descripcion_extendida?: string }
      return {
        titulo: String(parsed.titulo ?? '').slice(0, 60),
        descripcion_extendida: String(parsed.descripcion_extendida ?? ''),
      }
    } catch (parseErr) {
      console.error(`Expand parse error [${item.id}]:`, parseErr instanceof Error ? parseErr.message : String(parseErr))
      console.error('Cleaned:', cleaned.slice(0, 300))
      return { titulo: '', descripcion_extendida: '' }
    }
  } catch (err) {
    console.error(`Expand API error [${item.id}]:`, err)
    return { titulo: '', descripcion_extendida: '' }
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { budgetId, items } = body as {
      budgetId: string
      items: Array<{ id: string; description: string }>
    }

    if (!budgetId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'budgetId e items requeridos' }, { status: 400 })
    }

    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('id', budgetId)
      .eq('user_id', user.id)
      .single()

    if (!budget) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Una llamada por partida, en batches de 5 en paralelo
    const BATCH_SIZE = 5
    const expanded: Array<{ titulo: string; descripcion_extendida: string }> = new Array(items.length)

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(item => expandSingle(anthropic, item)))
      results.forEach((r, j) => { expanded[i + j] = r })
    }

    // Guardar en DB y construir respuesta
    const result: Array<{ id: string; titulo_partida: string; descripcion_extendida: string }> = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const exp = expanded[i]

      await supabase
        .from('line_items')
        .update({ titulo_partida: exp.titulo || null, descripcion_extendida: exp.descripcion_extendida || null })
        .eq('id', item.id)
        .eq('budget_id', budgetId)

      result.push({ id: item.id, titulo_partida: exp.titulo, descripcion_extendida: exp.descripcion_extendida })
    }

    console.log(`Expand descriptions: ${items.length} partidas procesadas`)

    return NextResponse.json({ items: result })

  } catch (error) {
    console.error('Error en /api/expand-descriptions:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
