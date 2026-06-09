export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres un experto en presupuestos de construcción y reformas en España.
Recibes un array JSON de partidas de presupuesto con descripciones cortas escritas por un profesional.

Para cada partida genera:
1. Un título corto y descriptivo (máx. 60 caracteres), que resuma la partida con precisión.
2. Una descripción extendida profesional y técnica (3-6 líneas) que incluya:
   materiales específicos con características técnicas, proceso de ejecución paso a paso,
   acabados y calidades, y cualquier detalle relevante para un presupuesto formal en España.

Devuelve SOLO un array JSON en el mismo orden que la entrada, sin texto adicional:
[{ "titulo": "...", "descripcion_extendida": "..." }, ...]

REGLAS ESTRICTAS:
- Mantén el mismo número de elementos que la entrada, en el mismo orden.
- No inventes materiales o procesos que contradigan la descripción original.
- Si la descripción original ya es técnica, expándela con más detalle, no la simplificues.
- Las unidades de medida y cantidades nunca se mencionan en el texto (van en otros campos).
- Todo en español, con vocabulario técnico de la construcción.`

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

    // Verificar que el presupuesto pertenece al usuario
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('id', budgetId)
      .eq('user_id', user.id)
      .single()

    if (!budget) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    // Llamar a Sonnet con todos los items en una sola llamada
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const input = items.map(i => ({ id: i.id, descripcion: i.description }))

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Expande estas partidas de presupuesto:\n${JSON.stringify(input, null, 2)}`,
      }],
    })

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''

    let expanded: Array<{ titulo: string; descripcion_extendida: string }>
    let cleaned = ''
    try {
      cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim()
      const firstBracket = cleaned.indexOf('[')
      if (firstBracket !== -1) cleaned = cleaned.slice(firstBracket)
      const lastBracket = cleaned.lastIndexOf(']')
      if (lastBracket !== -1) cleaned = cleaned.slice(0, lastBracket + 1)
      expanded = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Expand parse error:', parseErr instanceof Error ? parseErr.message : String(parseErr))
      console.error('Cleaned:', cleaned.slice(0, 500))
      console.error('Raw:', rawText)
      return NextResponse.json(
        { error: 'No se pudo parsear la respuesta de IA', raw: rawText },
        { status: 422 }
      )
    }

    if (!Array.isArray(expanded) || expanded.length !== items.length) {
      return NextResponse.json(
        { error: 'La respuesta de IA no tiene el formato esperado' },
        { status: 422 }
      )
    }

    // Guardar en DB y construir respuesta
    const result: Array<{ id: string; titulo_partida: string; descripcion_extendida: string }> = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const exp = expanded[i]
      const titulo = (exp?.titulo ?? '').slice(0, 60)
      const descripcion = exp?.descripcion_extendida ?? ''

      await supabase
        .from('line_items')
        .update({ titulo_partida: titulo || null, descripcion_extendida: descripcion || null })
        .eq('id', item.id)
        .eq('budget_id', budgetId)

      result.push({ id: item.id, titulo_partida: titulo, descripcion_extendida: descripcion })
    }

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

    return NextResponse.json({ items: result })

  } catch (error) {
    console.error('Error en /api/expand-descriptions:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
