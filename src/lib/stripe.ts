import Stripe from 'stripe'

// El || permite compilar sin la key real; en runtime Vercel la proveerá
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_build_placeholder')

export type PlanKey =
  | 'autonomo_mensual'    | 'autonomo_anual'
  | 'profesional_mensual' | 'profesional_anual'
  | 'empresa_mensual'     | 'empresa_anual'

const VALID_PLANS: PlanKey[] = [
  'autonomo_mensual',    'autonomo_anual',
  'profesional_mensual', 'profesional_anual',
  'empresa_mensual',     'empresa_anual',
]

export function isPlanKey(value: string): value is PlanKey {
  return VALID_PLANS.includes(value as PlanKey)
}

export const PRICES: Record<PlanKey, string> = {
  autonomo_mensual:    process.env.STRIPE_PRICE_AUTONOMO_MENSUAL    ?? '',
  autonomo_anual:      process.env.STRIPE_PRICE_AUTONOMO_ANUAL      ?? '',
  profesional_mensual: process.env.STRIPE_PRICE_PROFESIONAL_MENSUAL ?? '',
  profesional_anual:   process.env.STRIPE_PRICE_PROFESIONAL_ANUAL   ?? '',
  empresa_mensual:     process.env.STRIPE_PRICE_EMPRESA_MENSUAL     ?? '',
  empresa_anual:       process.env.STRIPE_PRICE_EMPRESA_ANUAL       ?? '',
}
