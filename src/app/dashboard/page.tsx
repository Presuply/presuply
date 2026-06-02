import Link from 'next/link'

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Presupuestos</h1>
        <p className="text-gray-500 mb-8">Aquí irá el listado de presupuestos. (Etapa 5)</p>
        <Link
          href="/dashboard/nuevo"
          className="flex items-center justify-center w-full rounded-xl bg-gray-900 px-4 py-4 text-base font-semibold text-white hover:bg-gray-700 transition-colors"
        >
          + Nuevo presupuesto
        </Link>
      </div>
    </main>
  )
}
