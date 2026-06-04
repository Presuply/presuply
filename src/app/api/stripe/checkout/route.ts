import { NextResponse } from 'next/server'
import { stripe, isPlanKey, PRICES } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { plan } = await request.json()

    if (!isPlanKey(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const priceId = PRICES[plan]
    if (!priceId) {
      return NextResponse.json({ error: 'Plan no configurado todavía' }, { status: 400 })
    }

    // Buscar o crear Stripe Customer vinculado al usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const origin = request.headers.get('origin') ?? 'https://www.presuply.app'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_collection: 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 90 },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing`,
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Error en /api/stripe/checkout:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
