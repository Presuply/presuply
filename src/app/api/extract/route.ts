export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, type PlanKey } from '@/lib/plans'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer partidas de presupuestos de construcción y oficios en España. Recibes fotos de libretas de obra escritas a mano, presupuestos impresos con anotaciones manuscritas, o texto pegado de WhatsApp.

Tu única tarea es devolver un JSON válido con las partidas detectadas. Nunca devuelvas texto adicional, explicaciones, comentarios ni marcas de formato como \`\`\`json. Solo el JSON puro.

INSTRUCCIONES ESTRICTAS DE FORMATO:

1. Extraer SIEMPRE la estructura: capítulos → partidas.
2. Si el documento no tiene capítulos claros, agrupar las partidas en capítulos lógicos por tipo de trabajo. Si no hay agrupación posible, usar un capítulo único con nombre "General".
3. Cada partida DEBE tener: descripcion, unidad, cantidad, precio_unitario, total. Nunca omitir ninguno de estos campos.
4. Si algún campo no aparece en el documento, inferirlo o dejarlo en 0 — nunca omitir el campo.
5. Las descripciones deben ser concisas pero completas (máx. 120 caracteres).
6. Las unidades deben seguir nomenclatura estándar de construcción española: m², m³, ml, ud, kg, h, pa (partida alzada). Si no puedes inferirla, usa null.
7. Los números decimales siempre con punto, nunca con coma.
8. No inventar partidas que no estén en el documento original.

REGLAS DE EXTRACCIÓN:

- En España los profesionales usan la coma o el apóstrofo como separador decimal: 29'56 y 29,56 son ambos 29.56. Normaliza siempre a punto decimal.
- Cuando veas una expresión como "8'40 × 46 = 386'40": cantidad 8.40, precio_unitario 46.00, total 386.40. Si el total escrito difiere del calculado, usa el escrito (es el valor acordado con el cliente).
- Si falta precio_unitario pero hay total y cantidad: precio_unitario = total / cantidad.
- Si solo hay descripción y total sin cantidad ni precio: cantidad 1, unidad "ud", precio_unitario igual al total.
- Si falta el total: total = cantidad × precio_unitario.
- Las líneas que parecen nombre de cliente o dirección van en el campo "cliente" del JSON raíz, no como partidas.
- Los totales globales del presupuesto no son partidas — ignóralos.
- Si hay texto impreso Y manuscrito, el manuscrito tiene PRIORIDAD (es la corrección del profesional).

CONSISTENCIA:
Responder SIEMPRE con el mismo esquema JSON, sin variaciones. No añadir campos extra, no omitir campos, no cambiar nombres de claves. No incluir texto fuera del JSON.

FORMATO DE RESPUESTA — devuelve exactamente esto, sin nada más:

{
  "titulo": "nombre del proyecto o trabajo si aparece en el documento, null si no",
  "cliente": "nombre del cliente si aparece, null si no",
  "capitulos": [
    {
      "nombre": "NOMBRE DEL CAPÍTULO",
      "partidas": [
        {
          "descripcion": "texto descriptivo de la partida (máx. 120 caracteres)",
          "unidad": "m² | m³ | ml | ud | kg | h | pa | null",
          "cantidad": 0.00,
          "precio_unitario": 0.00,
          "total": 0.00
        }
      ]
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

    // 2. Resolver cuenta: si es miembro de equipo, usar el perfil del owner
    const { data: teamRow } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('member_id', user.id)
      .maybeSingle()

    const profileOwnerId = teamRow?.owner_id ?? user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, budgets_used, is_team, plan_key, budgets_this_month, month_reset_at, template_schema')
      .eq('id', profileOwnerId)
      .single()

    if (!profile?.is_team) {
      const status = profile?.subscription_status ?? 'trial'
      const planKey = (profile?.plan_key ?? 'trial') as PlanKey

      if (status === 'canceled') {
        return NextResponse.json({ error: 'subscription_canceled' }, { status: 403 })
      }
      if (status === 'past_due') {
        return NextResponse.json({ error: 'payment_failed' }, { status: 403 })
      }

      // Trial: límite total de 3 presupuestos
      if (planKey === 'trial' && (profile?.budgets_used ?? 0) >= 3) {
        return NextResponse.json({ error: 'trial_exhausted' }, { status: 403 })
      }

      // Resetear contador mensual si el mes ha cambiado
      const today = new Date().toISOString().slice(0, 10)
      const resetAt = profile?.month_reset_at ?? today
      if (resetAt < today) {
        await supabase
          .from('profiles')
          .update({ budgets_this_month: 0, month_reset_at: today })
          .eq('id', user.id)
        if (profile) profile.budgets_this_month = 0
      }

      // Límite mensual según plan
      const limits = getPlanLimits(planKey, false)
      if (limits.budgetsPerMonth !== null && (profile?.budgets_this_month ?? 0) >= limits.budgetsPerMonth) {
        return NextResponse.json({ error: 'monthly_limit' }, { status: 403 })
      }
    }

    // 3. Parsear body
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

    // 3. Descargar archivos de Storage y construir bloques de contenido
    const contentBlocks: Anthropic.ContentBlockParam[] = []

    for (const path of uploadPaths) {
      const { data: signedData } = await supabase.storage
        .from('uploads')
        .createSignedUrl(path, 60)

      if (!signedData?.signedUrl) continue

      const fileResponse = await fetch(signedData.signedUrl)
      if (!fileResponse.ok) continue

      const buffer = await fileResponse.arrayBuffer()
      const contentType = fileResponse.headers.get('content-type') ?? ''
      const isPdf = contentType.includes('application/pdf') || path.toLowerCase().endsWith('.pdf')

      if (isPdf) {
        contentBlocks.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: arrayBufferToBase64(buffer),
          },
        } as unknown as Anthropic.ContentBlockParam)
      } else {
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: toValidMediaType(contentType),
            data: arrayBufferToBase64(buffer),
          },
        })
      }
    }

    if (contentBlocks.length === 0 && !text) {
      return NextResponse.json(
        { error: 'No se pudieron descargar los archivos y no hay texto' },
        { status: 422 }
      )
    }

    // 4. Llamar a Claude con prompt cacheado
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Construir el system prompt: base + sección de schema si existe
    const templateSchema = (profile as { template_schema?: Record<string, unknown> | null } | null)?.template_schema
    const schemaSection = templateSchema
      ? `\n\nPLANTILLA MAESTRA DEL USUARIO — SEGUIR ESTRICTAMENTE:\nEste usuario tiene una plantilla de referencia que define su estilo habitual. Aplica este esquema al estructurar el presupuesto:\n${JSON.stringify(templateSchema, null, 2)}\n\n- Usa los tipos de capítulos del esquema cuando correspondan al contenido del documento.\n- Respeta la nomenclatura de unidades definida en el campo "nomenclatura_unidades".\n- Mantén el mismo nivel de detalle y longitud de descripciones que indica el esquema.\n- Si el documento tiene información de un tipo de trabajo no contemplado en el esquema, añade el capítulo necesario manteniendo el mismo estilo.\n- El esquema es una guía de estilo, no una restricción de contenido: extrae lo que hay en el documento, pero con el formato del esquema.`
      : ''

    const effectiveSystemPrompt = SYSTEM_PROMPT + schemaSection

    const userContent: Anthropic.ContentBlockParam[] = [
      ...contentBlocks,
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
          text: effectiveSystemPrompt,
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

    // Log siempre para diagnóstico en Vercel
    console.log('Claude extract raw (first 500 chars):', rawText.slice(0, 500))

    let parsed: unknown
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

      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      // Segundo intento: buscar el array de capítulos directamente en el raw
      const capMatch = rawText.match(/"capitulos"\s*:\s*(\[[\s\S]*\])/)
      if (capMatch) {
        try {
          const capArray = JSON.parse(capMatch[1])
          parsed = { titulo: null, cliente: null, capitulos: capArray }
          console.warn('Extract: parse principal falló, recuperado via regex de capitulos')
        } catch {
          // fall through al error final
        }
      }

      if (!parsed) {
        console.error('Extract parse error:', parseErr instanceof Error ? parseErr.message : String(parseErr))
        console.error('Cleaned string:', cleaned.slice(0, 500))
        console.error('Raw text completo:', rawText)
        return NextResponse.json(
          { error: 'No se pudo procesar la respuesta de la IA', raw: rawText },
          { status: 422 }
        )
      }
    }

    // Compatibilidad con schema antiguo (cliente_detectado) por si Claude lo devuelve
    const parsedObj = parsed as Record<string, unknown>
    if (!parsedObj.cliente && parsedObj.cliente_detectado) {
      parsedObj.cliente = parsedObj.cliente_detectado
    }

    // 7. Guardar capítulos y partidas en Supabase
    type RawPartida = {
      descripcion: string
      unidad: string | null
      cantidad: number
      precio_unitario: number
      total: number
    }
    type RawCapitulo = { nombre: string; partidas: RawPartida[] }

    const extracted = parsed as {
      titulo?: string | null
      cliente?: string | null
      capitulos?: RawCapitulo[]
    }

    // Normalizar: si Claude devolviera estructura antigua con "partidas" planas, envolverlas
    let capitulos: RawCapitulo[] = Array.isArray(extracted.capitulos)
      ? extracted.capitulos
      : []
    if (capitulos.length === 0) {
      const legacy = (parsed as { partidas?: RawPartida[] }).partidas
      if (Array.isArray(legacy) && legacy.length > 0) {
        capitulos = [{ nombre: 'General', partidas: legacy }]
      }
    }

    for (let ci = 0; ci < capitulos.length; ci++) {
      const cap = capitulos[ci]
      const partidas = Array.isArray(cap.partidas) ? cap.partidas : []
      if (partidas.length === 0) continue

      // Crear capítulo
      const { data: chapterRow } = await supabase
        .from('chapters')
        .insert({
          budget_id: budgetId,
          user_id: user.id,
          name: cap.nombre ?? `Capítulo ${ci + 1}`,
          position: ci,
        })
        .select('id')
        .single()

      if (!chapterRow) continue

      // Insertar partidas del capítulo (sin campo confidence — schema nuevo no incluye confianza)
      await supabase.from('line_items').insert(
        partidas.map((p, pi) => ({
          budget_id: budgetId,
          user_id: user.id,
          chapter_id: chapterRow.id,
          description: p.descripcion ?? '',
          unit: p.unidad ?? null,
          quantity: Number(p.cantidad) || 0,
          unit_price: Number(p.precio_unitario) || 0,
          total: Number(p.total) || 0,
          confidence: null,
          position: pi,
        }))
      )
    }

    // Actualizar client_name (campo "cliente" en nuevo schema)
    if (extracted.cliente) {
      await supabase
        .from('budgets')
        .update({ client_name: extracted.cliente })
        .eq('id', budgetId)
        .eq('user_id', user.id)
    }

    // Guardar título del proyecto en budgets.title si está vacío
    if (extracted.titulo) {
      await supabase
        .from('budgets')
        .update({ title: extracted.titulo })
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .is('title', null)
    }

    // Incrementar contadores en el perfil del owner (no aplica a is_team)
    if (!profile?.is_team) {
      await supabase
        .from('profiles')
        .update({
          budgets_used: (profile?.budgets_used ?? 0) + 1,
          budgets_this_month: (profile?.budgets_this_month ?? 0) + 1,
        })
        .eq('id', profileOwnerId)
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
