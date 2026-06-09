import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { budgetId } = await req.json()
  if (!budgetId) return NextResponse.json({ error: 'Falta budgetId' }, { status: 400 })

  // Cargar presupuesto original
  const { data: original, error: budgetErr } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .eq('user_id', user.id)
    .single()

  if (budgetErr || !original) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
  }

  // Cargar capítulos y partidas
  const [{ data: chapters }, { data: items }] = await Promise.all([
    supabase.from('chapters').select('*').eq('budget_id', budgetId).order('position'),
    supabase.from('line_items').select('*').eq('budget_id', budgetId).order('position'),
  ])

  // Calcular siguiente budget_number
  const { data: maxRow } = await supabase
    .from('budgets')
    .select('budget_number')
    .eq('user_id', user.id)
    .order('budget_number', { ascending: false })
    .limit(1)
    .single()

  const nextNumber = (maxRow?.budget_number ?? 0) + 1
  const today = new Date().toISOString().slice(0, 10)
  const baseNombre = original.nombre ?? original.client_name ?? 'Presupuesto'
  const newNombre = `${baseNombre} (copia)`

  // Insertar nuevo presupuesto
  const { data: newBudget, error: insertErr } = await supabase
    .from('budgets')
    .insert({
      user_id: user.id,
      budget_number: nextNumber,
      client_name: original.client_name,
      client_email: original.client_email,
      client_address: original.client_address,
      client_phone: original.client_phone,
      client_nif: original.client_nif,
      nombre: newNombre,
      status: 'borrador',
      tax_type: original.tax_type,
      tax_rate: original.tax_rate,
      subtotal: original.subtotal,
      overhead_enabled: original.overhead_enabled,
      overhead_rate: original.overhead_rate,
      profit_enabled: original.profit_enabled,
      profit_rate: original.profit_rate,
      extras_description: original.extras_description,
      extras_amount: original.extras_amount,
      tax_amount: original.tax_amount,
      total: original.total,
      issued_date: today,
      valid_days: original.valid_days,
      show_iban: original.show_iban,
      show_signature: original.show_signature,
      expand_descriptions: original.expand_descriptions,
      folder_id: original.folder_id,
    })
    .select('id')
    .single()

  if (insertErr || !newBudget) {
    return NextResponse.json({ error: 'Error al crear el presupuesto' }, { status: 500 })
  }

  const newBudgetId = newBudget.id

  // Insertar capítulos y construir mapa old_id → new_id
  const chapterMap = new Map<string, string>()
  for (const ch of (chapters ?? [])) {
    const { data: newCh } = await supabase
      .from('chapters')
      .insert({ budget_id: newBudgetId, user_id: user.id, name: ch.name, position: ch.position })
      .select('id')
      .single()
    if (newCh) chapterMap.set(ch.id, newCh.id)
  }

  // Insertar partidas con chapter_id remapeado
  if ((items ?? []).length > 0) {
    const newItems = (items ?? []).map(item => ({
      budget_id: newBudgetId,
      user_id: user.id,
      chapter_id: item.chapter_id ? (chapterMap.get(item.chapter_id) ?? null) : null,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      confidence: item.confidence,
      position: item.position,
      descripcion_extendida: null,
      titulo_partida: null,
    }))
    await supabase.from('line_items').insert(newItems)
  }

  return NextResponse.json({ newBudgetId })
}
