import type { Metadata } from 'next'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Presuply',
}

const sections = [
  { title: '1. Objeto y aceptación', body: '[Contenido pendiente]' },
  { title: '2. Descripción del servicio', body: '[Contenido pendiente]' },
  { title: '3. Registro y cuenta de usuario', body: '[Contenido pendiente]' },
  { title: '4. Condiciones de uso', body: '[Contenido pendiente]' },
  { title: '5. Planes y facturación', body: '[Contenido pendiente]' },
  { title: '6. Propiedad intelectual', body: '[Contenido pendiente]' },
  { title: '7. Protección de datos', body: '[Contenido pendiente]' },
  { title: '8. Limitación de responsabilidad', body: '[Contenido pendiente]' },
  { title: '9. Modificaciones', body: '[Contenido pendiente]' },
  { title: '10. Legislación aplicable', body: '[Contenido pendiente]' },
]

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex flex-col">
      <div className="flex-1 px-4 py-12">
        <article className="max-w-2xl mx-auto space-y-8">

          <header className="space-y-3">
            <a href="/" className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors inline-flex items-center gap-1">
              ← Volver
            </a>
            <h1 className="text-3xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9] font-[family-name:var(--font-syne)]">
              Términos y Condiciones
            </h1>
            <p className="text-sm text-[#A9B5C2]">Última actualización: 7 de junio de 2026</p>
            <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed">
              Por favor, lee atentamente estos Términos y Condiciones antes de usar Presuply. Al crear una cuenta o usar el servicio, aceptas quedar vinculado por estos términos.
            </p>
          </header>

          <div className="w-12 h-1 bg-[#FF6A00] rounded-full" />

          {sections.map(s => (
            <section key={s.title} className="space-y-3">
              <h2 className="text-base font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] font-[family-name:var(--font-syne)]">
                {s.title}
              </h2>
              <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed">
                {s.body}
              </p>
            </section>
          ))}

          <div className="border-t border-[#D5DCE4] dark:border-[#3A4A5C] pt-6">
            <p className="text-xs text-[#A9B5C2]">
              Titular: Grupo Tompeca Inversiones S.L. · Contacto:{' '}
              <a href="mailto:contacto@presuply.app" className="text-[#FF6A00] hover:underline">
                contacto@presuply.app
              </a>
            </p>
          </div>

        </article>
      </div>
      <Footer />
    </div>
  )
}
