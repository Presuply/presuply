import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex flex-col items-center gap-4 mb-8">
        <img src="/images/logo.svg" alt="Presuply" className="h-16 w-auto" />
        <h1 className="text-4xl font-bold tracking-tight text-[#0D1B2A] dark:text-[#F4F6F9]">
          Presuply
        </h1>
      </div>
      <p className="text-lg text-[#6B7B8C] dark:text-[#A9B5C2] max-w-sm">
        Haz una foto a tu libreta o pega un mensaje de WhatsApp. Obtén un
        presupuesto profesional listo para enviar.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
        <Link
          href="/login"
          className="bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-6 py-3 text-base transition-colors text-center"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="bg-[#EDF0F4] dark:bg-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] hover:bg-[#D5DCE4] dark:hover:bg-[#4A5A6C] font-semibold rounded-[8px] px-6 py-3 text-base transition-colors text-center"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
