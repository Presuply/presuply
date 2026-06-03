export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer partidas de presupuestos de construcción y oficios en España. Recibes fotos de libretas de obra escritas a mano, presupuestos impresos con anotaciones manuscritas, o texto pegado de WhatsApp.

Tu única tarea es devolver un JSON válido con las partidas detectadas. Nunca devuelvas texto adicional, explicaciones, comentarios ni marcas de formato como \`\`\`json. Solo el JSON puro.

REGLAS DE EXTRACCIÓN:

1. SEPARADOR DECIMAL
   En España los profesionales usan la coma o el apóstrofo como separador decimal: 29'56 y 29,56 son ambos 29.56.
   Normaliza siempre a punto decimal en los números del JSON.

2. OPERACIONES EN LÍNEA
   Cuando veas una expresión como "8'40 × 46 = 386'40", extrae:
   - cantidad: 8.40
   - precio_unitario: 46.00
   - total: 386.40
   Si el resultado escrito difiere del calculado, usa el escrito (es el valor acordado con el cliente).

3. PARTIDAS INCOMPLETAS
   - Si falta el precio unitario pero hay total y cantidad, calcula: precio_unitario = total / cantidad
   - Si solo hay descripción y total sin cantidad ni precio, pon cantidad: 1, unidad: "ud", precio_unitario: igual al total
   - Si falta el total, calcula: total = cantidad × precio_unitario
   - Si hay ambigüedad irresoluble, marca confianza: "baja"

4. CABECERAS Y TOTALES GLOBALES
   Las líneas que parecen nombre de cliente o dirección (ej: "Frente La Gomera", "Ángeles / Yurena") van en el campo cliente_detectado del JSON raíz, no como partidas.
   Los totales globales del presupuesto (ej: "Total: 2.219,13 €") no son partidas — ignóralos.

5. PRESUPUESTOS IMPRESOS CON ANOTACIONES
   Si hay texto impreso Y manuscrito, las anotaciones manuscritas tienen PRIORIDAD sobre los valores impresos. El manuscrito es la corrección del profesional para ese cliente concreto.
   Ignora el texto transparentado del reverso del papel.

6. UNIDADES HABITUALES
   Infiere la unidad por contexto si no está escrita:
   - Superficies → m²
   - Longitudes → ml
   - Piezas/instalaciones → ud
   - Horas → h
   Si no puedes inferirla, deja unidad: null

7. CONFIANZA
   - "alta": descripción, cantidad, precio y total claros
   - "media": algún dato inferido o calculado
   - "baja": letra ilegible, dato ambiguo o falta información clave

FORMATO DE RESPUESTA — devuelve exactamente esto, sin nada más:

{
  "cliente_detectado": "nombre si aparece, null si no",
  "notas": "cualquier información relevante que no sea una partida",
  "partidas": [
    {
      "descripcion": "texto descriptivo de la partida",
      "unidad": "m² | ml | ud | h | null",
      "cantidad": 0.00,
      "precio_unitario": 0.00,
      "total": 0.00,
      "confianza": "alta | media | baja"
    }
  ]
}`

const USER_PROMPT =
  'Extrae todas las partidas de las siguientes imágenes de presupuesto. ' +
  'Pueden ser fotos de libreta, presupuesto impreso con anotaciones, o una combinación. ' +
  'Sigue las reglas del sistema y devuelve solo el JSON.'

type ValidMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

function toValidMediaType(contentType: string | null): ValidMediaType {
  const supported: ValidMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const type = (contentType ?? '').split(';')[0].trim() as ValidMediaType
  return supported.includes(type) ? type : 'image/jpeg'
}

// Edge-compatible base64 encoding — procesa en chunks para evitar stack overflow
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

export async function POST(request: Request) {
  try {
    // 1. Verificar sesión
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Parsear body
    let budgetId: string
    let uploadPaths: string[]
    let text: string | undefined

    try {
      const body = await request.json()
      budgetId = body.budgetId
      uploadPaths = Array.isArray(body.uploadPaths) ? body.uploadPaths : []
      text = typeof body.text === 'string' && body.text.trim() ? body.text.trim() : undefined
    } catch {
      return NextResponse.json({ error: 'Cuerpo de la petición inválido' }, { status: 400 })
    }

    if (!budgetId || (uploadPaths.length === 0 && !text)) {
      return NextResponse.json(
        { error: 'Se requiere budgetId y al menos una imagen o texto' },
        { status: 400 }
      )
    }

    // 3. Descargar imágenes de Storage y convertir a base64
    const imageBlocks: Anthropic.ImageBlockParam[] = []

    for (const path of uploadPaths) {
      const { data: signedData } = await supabase.storage
        .from('uploads')
        .createSignedUrl(path, 60)

      if (!signedData?.signedUrl) continue

      const imageResponse = await fetch(signedData.signedUrl)
      if (!imageResponse.ok) continue

      const buffer = await imageResponse.arrayBuffer()

      imageBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: toValidMediaType(imageResponse.headers.get('content-type')),
          data: arrayBufferToBase64(buffer),
        },
      })
    }

    if (imageBlocks.length === 0 && !text) {
      return NextResponse.json(
        { error: 'No se pudieron descargar las imágenes y no hay texto' },
        { status: 422 }
      )
    }

    // 4. Llamar a Claude con prompt cacheado
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const userContent: Anthropic.ContentBlockParam[] = [
      ...imageBlocks,
      {
        type: 'text',
        text: text ? `${USER_PROMPT}\n\nTexto adicional del profesional:\n${text}` : USER_PROMPT,
      },
    ]

    const claudeResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    })

    // 5. Registrar tokens (para medir coste real por presupuesto)
    const usage = claudeResponse.usage as Anthropic.Usage & {
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    console.log('Claude tokens:', JSON.stringify({
      input: usage.input_tokens,
      output: usage.output_tokens,
      cache_creation: usage.cache_creation_input_tokens ?? 0,
      cache_read: usage.cache_read_input_tokens ?? 0,
    }))

    // 6. Parsear respuesta de forma defensiva
    const rawText =
      claudeResponse.content[0]?.type === 'text' ? claudeResponse.content[0].text : ''

    let parsed: unknown
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Respuesta no parseable de Claude:', rawText)
      return NextResponse.json(
        { error: 'No se pudo parsear la respuesta de Claude', raw: rawText },
        { status: 422 }
      )
    }

    // 7. Guardar partidas en line_items y actualizar el budget
    const extracted = parsed as {
      cliente_detectado?: string | null
      notas?: string | null
      partidas?: Array<{
        descripcion: string
        unidad: string | null
        cantidad: number
        precio_unitario: number
        total: number
        confianza: string
      }>
    }

    const partidas = Array.isArray(extracted.partidas) ? extracted.partidas : []

    if (partidas.length > 0) {
      await supabase.from('line_items').insert(
        partidas.map((p, index) => ({
          budget_id: budgetId,
          user_id: user.id,
          description: p.descripcion ?? '',
          unit: p.unidad ?? null,
          quantity: Number(p.cantidad) || 0,
          unit_price: Number(p.precio_unitario) || 0,
          total: Number(p.total) || 0,
          confidence: (['alta', 'media', 'baja'].includes(p.confianza)
            ? p.confianza
            : null) as 'alta' | 'media' | 'baja' | null,
          position: index,
        }))
      )
    }

    if (extracted.cliente_detectado) {
      await supabase
        .from('budgets')
        .update({ client_name: extracted.cliente_detectado })
        .eq('id', budgetId)
        .eq('user_id', user.id)
    }

    return NextResponse.json(parsed)

  } catch (error) {
    console.error('Error no capturado en /api/extract:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
