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
      'Presupuestos ilimitados',
      'Extracción con IA desde foto',
      'PDF profesional descargable',
      'Plantilla personalizada',
      '1 usuario',
      'Soporte por email',
    ],
  },
  {
    key: 'profesional',
    name: 'Profesional',
    monthly: 99,
    annual: 79,
    highlight: true,
    features: [
      'Todo lo de Autónomo',
      'Gastos generales y beneficio industrial',
      'Extracción de varias fotos a la vez',
      'Historial completo de presupuestos',
      'Soporte prioritario',
    ],
  },
  {
    key: 'empresa',
    name: 'Empresa',
    monthly: 249,
    annual: 199,
    features: [
      'Todo lo de Profesional',
      'Múltiples empresas',
      'Estadísticas y métricas',
      'Integración API (próximamente)',
      'Soporte premium',
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
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Cabecera */}
        <div className="text-center space-y-3">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Volver al dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Elige tu plan</h1>
          <p className="text-gray-500">90 días de prueba gratuita. Cancela cuando quieras.</p>
        </div>

        {/* Toggle mensual / anual */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setBilling('mensual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billing === 'mensual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling('anual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billing === 'anual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Anual
              <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
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
                className={`bg-white rounded-2xl border p-6 flex flex-col gap-6 ${
                  'highlight' in plan && plan.highlight
                    ? 'border-gray-900 shadow-lg ring-1 ring-gray-900'
                    : 'border-gray-200'
                }`}
              >
                {'highlight' in plan && plan.highlight && (
                  <div className="text-center">
                    <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                      Más popular
                    </span>
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-bold text-gray-900">{price}€</span>
                    <span className="text-sm text-gray-500 mb-1">/mes</span>
                  </div>
                  {billing === 'anual' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Facturado anualmente ({price * 12}€/año)
                    </p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-gray-400 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleCheckout(plan.key)}
                  disabled={isLoading}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    'highlight' in plan && plan.highlight
                      ? 'bg-gray-900 text-white hover:bg-gray-700'
                      : 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isLoading ? 'Redirigiendo...' : 'Empezar prueba gratuita'}
                </button>
              </div>
            )
          })}
        </div>

        {error && (
          <p role="alert" className="text-center rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-gray-400">
          Al continuar aceptas nuestros términos de servicio. Cancela en cualquier momento desde tu panel de suscripción.
        </p>

      </div>
    </main>
  )
}
