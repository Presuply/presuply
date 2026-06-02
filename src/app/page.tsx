import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        Presupuestos App
      </h1>
      <p className="mt-4 text-lg text-gray-600 max-w-md">
        Haz una foto a tu libreta o pega un mensaje de WhatsApp. Obtén un
        presupuesto profesional listo para enviar.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-500"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow hover:bg-gray-50"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
