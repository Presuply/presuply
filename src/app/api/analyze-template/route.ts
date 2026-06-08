export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-opus-4-7'

const SYSTEM_PROMPT = `Eres un experto en presupuestos de construcción y reformas en España.
Recibes un presupuesto de referencia de un instalador o empresa. Tu tarea es analizarlo y extraer un esquema maestro estructurado que capture las características y el estilo de trabajo habitual de ese profesional.

OBJETIVO:
Generar un JSON que sirva como guía fija para que todos los presupuestos futuros de este usuario sigan el mismo esquema, nomenclatura y nivel de detalle.

ANÁLISIS QUE DEBES REALIZAR:
1. Nivel de detalle de las descripciones (cortas y telegráficas, medias con especificaciones básicas, o largas con materiales y procedimientos completos)
2. Longitud típica de descripción de partida (número aproximado de palabras)
3. Si separa mano de obra y materiales en partidas distintas o las agrupa
4. Tipos de capítulos que usa habitualmente (Demolición, Albañilería, Fontanería, etc.)
5. Nomenclatura de unidades preferida (m², ml, ud, h, pa, etc.)
6. Nivel de especificidad: si menciona marcas, modelos, normativas, acabados

FORMATO DE RESPUESTA — devuelve SOLO este JSON, sin texto adicional:

{
  "estilo": {
    "nivel_detalle": "alto|medio|bajo",
    "longitud_descripcion": "corta|media|larga",
    "palabras_tipicas_descripcion": 8,
    "incluye_mano_de_obra_separada": true,
    "menciona_marcas_o_modelos": false,
    "nomenclatura_unidades": ["m²", "ml", "ud"]
  },
  "capitulos_habituales": [
    {
      "nombre": "DEMOLICIONES",
      "descripcion_tipo": "Breve descripción del tipo de trabajos en este capítulo",
      "unidades_frecuentes": ["m²", "m³", "ud"]
    }
  ],
  "ejemplo_partidas": [
    {
      "descripcion": "Ejemplo real o representativo de cómo describe una partida este instalador",
      "unidad": "m²",
      "nivel_especificidad": "alto|medio|bajo"
    }
  ]
}

IMPORTANTE:
- Extrae los capítulos tal como aparecen en el documento, sin inventar los que no estén.
- Las partidas de ejemplo deben ser representativas del estilo real del profesional, extraídas del documento.
- Si el nivel de detalle es bajo (descripciones muy cortas), refléjalo fielmente — no lo mejores.
- Máximo 6 capítulos habituales y 4 partidas de ejemplo.`

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(new Uint8Array(buffer)).toString('base64')
  }
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { templateUrl } = await request.json()
    if (!templateUrl) {
      return NextResponse.json({ error: 'templateUrl requerido' }, { status: 400 })
    }

    // Descargar plantilla desde Storage
    const { data: signedData } = await supabase.storage
      .from('logos')
      .createSignedUrl(templateUrl, 120)

    if (!signedData?.signedUrl) {
      return NextResponse.json({ error: 'No se pudo acceder a la plantilla' }, { status: 422 })
    }

    const fileResponse = await fetch(signedData.signedUrl)
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Error al descargar la plantilla' }, { status: 422 })
    }

    const buffer = await fileResponse.arrayBuffer()
    const contentType = fileResponse.headers.get('content-type') ?? ''
    const isPdf = contentType.includes('pdf') || templateUrl.toLowerCase().endsWith('.pdf')
    const base64 = arrayBufferToBase64(buffer)

    const templateBlock: Anthropic.ContentBlockParam = isPdf
      ? ({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        } as unknown as Anthropic.ContentBlockParam)
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
              contentType.split(';')[0].trim()
            )
              ? contentType.split(';')[0].trim()
              : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        }

    // Enviar a Claude Opus para análisis
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          templateBlock,
          {
            type: 'text',
            text: 'Analiza este presupuesto de referencia y genera el esquema maestro JSON según las instrucciones. Devuelve solo el JSON puro, sin texto adicional.',
          },
        ],
      }],
    })

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let schema: Record<string, unknown>
    try {
      schema = JSON.parse(cleaned)
    } catch {
      console.error('Respuesta no parseable de Claude Opus:', rawText)
      return NextResponse.json(
        { error: 'No se pudo parsear el esquema generado por IA', raw: rawText },
        { status: 422 }
      )
    }

    // Validación mínima
    if (!schema.estilo || !Array.isArray(schema.capitulos_habituales)) {
      return NextResponse.json(
        { error: 'Esquema incompleto — faltan campos obligatorios' },
        { status: 422 }
      )
    }

    // Guardar en profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ template_schema: schema })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error guardando template_schema:', updateError)
      return NextResponse.json({ error: 'Error al guardar el esquema' }, { status: 500 })
    }

    const usage = response.usage as Anthropic.Usage & {
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    console.log('Analyze template tokens:', JSON.stringify({
      input: usage.input_tokens,
      output: usage.output_tokens,
      cache_creation: usage.cache_creation_input_tokens ?? 0,
      cache_read: usage.cache_read_input_tokens ?? 0,
    }))

    return NextResponse.json({ success: true, schema })

  } catch (error) {
    console.error('Error en /api/analyze-template:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
