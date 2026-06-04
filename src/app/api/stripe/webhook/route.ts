import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Mapea el status de Stripe a nuestro subscription_status
function mapStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    trialing:           'trialing',
    active:             'active',
    past_due:           'past_due',
    canceled:           'canceled',
    unpaid:             'past_due',
    incomplete:         'past_due',
    incomplete_expired: 'canceled',
    paused:             'past_due',
  }
  return map[stripeStatus] ?? stripeStatus
}

function customerId(obj: { customer: string | Stripe.Customer | Stripe.DeletedCustomer | null }): string {
  const c = obj.customer
  if (typeof c === 'string') return c
  return c?.id ?? ''
}

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature') ?? ''
  const rawBody = await request.arrayBuffer()
  const buf = Buffer.from(rawBody)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('profiles')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: mapStatus(sub.status),
          })
          .eq('stripe_customer_id', customerId(sub))
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('profiles')
          .update({ subscription_status: 'canceled' })
          .eq('stripe_customer_id', customerId(sub))
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await supabase
          .from('profiles')
          .update({ subscription_status: 'active' })
          .eq('stripe_customer_id', customerId(invoice))
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId(invoice))
        break
      }
    }
  } catch (err) {
    // Logueamos pero devolvemos 200: si Stripe recibe 5xx reintentará el evento
    console.error(`Error procesando ${event.type}:`, err)
  }

  return NextResponse.json({ received: true })
}
