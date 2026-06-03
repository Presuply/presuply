import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        Presuply
      </h1>
      <p className="mt-4 text-lg text-gray-500 max-w-sm">
        Haz una foto a tu libreta o pega un mensaje de WhatsApp. Obtén un
        presupuesto profesional listo para enviar.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
        <Link
          href="/login"
          className="rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-700 transition-colors text-center"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-center"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
