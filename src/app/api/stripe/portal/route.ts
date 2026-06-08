import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 })
    }

    const origin = request.headers.get('origin') ?? 'https://www.presuply.app'

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard/perfil`,
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Error en /api/stripe/portal:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
