export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBudgetPdf } from '@/lib/pdf-generator'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get('budgetId')
    if (!budgetId) return NextResponse.json({ error: 'budgetId requerido' }, { status: 400 })

    const { data: b } = await supabase
      .from('budgets')
      .select('budget_number')
      .eq('id', budgetId)
      .eq('user_id', user.id)
      .single()
    if (!b) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

    const pdfBuffer = await generateBudgetPdf(budgetId, supabase, user.id, user.email ?? '')

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presupuesto-${b.budget_number}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('Error en /api/generate-pdf:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
