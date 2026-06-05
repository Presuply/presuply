'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PLANS = [
  {
    key: 'autonomo',
    name: 'Autónomo',
    monthly: 49,
    annual: 39,
    features: [
      '1 usuario',
      'Hasta 20 presupuestos al mes',
      'Generación desde foto, PDF o texto de WhatsApp',
      'Extracción de partidas con IA',
      'Capítulos en el presupuesto',
      'Editor con recálculo automático',
      'Expansión de descripciones con IA',
      'PDF profesional descargable',
      'IGIC / IVA configurable',
      'Plantilla con tu logo y datos',
    ],
  },
  {
    key: 'profesional',
    name: 'Profesional',
    monthly: 99,
    annual: 79,
    highlight: true,
    features: [
      'Hasta 3 usuarios',
      'Hasta 50 presupuestos al mes',
      'Todo lo de Autónomo, más:',
      'Carpetas para organizar presupuestos',
      'Soporte prioritario',
    ],
  },
  {
    key: 'empresa',
    name: 'Empresa',
    monthly: 249,
    annual: 199,
    features: [
      'Usuarios ilimitados',
      'Presupuestos ilimitados',
      'Todo lo de Profesional, más:',
      'Panel de administrador (próximamente)',
      'Integraciones / API (próximamente)',
      'Gestor de cuenta dedicado',
    ],
  },
] as const

type Billing = 'mensual' | 'anual'

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<Billing>('mensual')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout(planKey: string) {
    const plan = `${planKey}_${billing}`
    setLoading(planKey)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      if (res.status === 401) {
        router.push('/login?redirect=/pricing')
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al iniciar el pago.')
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('No se pudo conectar con el servidor. Inténtalo de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Cabecera */}
        <div className="text-center space-y-3">
          <Link href="/dashboard" className="text-sm text-[#6B7B8C] hover:text-[#FF6A00] transition-colors">
            ← Volver al dashboard
          </Link>
          <div className="flex justify-center">
            <img src="/images/logo.svg" alt="Presuply" className="h-10 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Elige tu plan</h1>
          <p className="text-[#6B7B8C] dark:text-[#A9B5C2]">3 presupuestos gratis. Cancela cuando quieras.</p>
        </div>

        {/* Toggle mensual / anual */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1 bg-[#EDF0F4] dark:bg-[#1B2A3A] rounded-[10px] p-1">
            <button
              type="button"
              onClick={() => setBilling('mensual')}
              className={`px-4 py-2 rounded-[8px] text-sm font-semibold transition-colors ${
                billing === 'mensual'
                  ? 'bg-white dark:bg-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] shadow-sm'
                  : 'text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9]'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling('anual')}
              className={`px-4 py-2 rounded-[8px] text-sm font-semibold transition-colors ${
                billing === 'anual'
                  ? 'bg-white dark:bg-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] shadow-sm'
                  : 'text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9]'
              }`}
            >
              Anual
              <span className="ml-1.5 rounded-full bg-[#1FB57A]/15 px-1.5 py-0.5 text-xs font-bold text-[#1FB57A]">
                −20%
              </span>
            </button>
          </div>
        </div>

        {/* Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const price = billing === 'mensual' ? plan.monthly : plan.annual
            const isLoading = loading === plan.key

            return (
              <div
                key={plan.key}
                className={`bg-white dark:bg-[#1B2A3A] rounded-[16px] border p-6 flex flex-col gap-6 shadow-sm ${
                  'highlight' in plan && plan.highlight
                    ? 'border-[#FF6A00] shadow-[0_0_0_2px_#FF6A00]'
                    : 'border-[#D5DCE4] dark:border-[#3A4A5C]'
                }`}
              >
                {'highlight' in plan && plan.highlight && (
                  <div className="text-center">
                    <span className="rounded-full bg-[#FF6A00] px-3 py-1 text-xs font-bold text-white">
                      Más popular
                    </span>
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">{plan.name}</h2>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">{price}€</span>
                    <span className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] mb-1">/mes</span>
                  </div>
                  {billing === 'anual' && (
                    <p className="text-xs text-[#A9B5C2] mt-1">
                      Facturado anualmente ({price * 12}€/año)
                    </p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
                      <span className="text-[#1FB57A] shrink-0 font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleCheckout(plan.key)}
                  disabled={isLoading}
                  className={`w-full rounded-[8px] px-4 py-3 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    'highlight' in plan && plan.highlight
                      ? 'bg-[#FF6A00] text-white hover:bg-[#FF9248]'
                      : 'border border-[#FF6A00] text-[#FF6A00] hover:bg-orange-50 dark:hover:bg-orange-900/20'
                  }`}
                >
                  {isLoading ? 'Redirigiendo...' : 'Empezar prueba gratuita'}
                </button>
              </div>
            )
          })}
        </div>

        {error && (
          <p role="alert" className="text-center rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-[#A9B5C2]">
          Al continuar aceptas nuestros términos de servicio. Cancela en cualquier momento desde tu panel de suscripción.
        </p>

      </div>
    </main>
  )
}
