import type { Metadata } from 'next'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Política de Cookies — Presuply',
}

const sections = [
  { title: '1. ¿Qué son las cookies?', body: '[Contenido pendiente]' },
  { title: '2. Tipos de cookies que utilizamos', body: '[Contenido pendiente]' },
  { title: '3. Cookies propias', body: '[Contenido pendiente]' },
  { title: '4. Cookies de terceros', body: '[Contenido pendiente]' },
  { title: '5. Cómo gestionar las cookies', body: '[Contenido pendiente]' },
  { title: '6. Actualizaciones de esta política', body: '[Contenido pendiente]' },
]

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex flex-col">
      <div className="flex-1 px-4 py-12">
        <article className="max-w-2xl mx-auto space-y-8">

          <header className="space-y-3">
            <a href="/" className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors inline-flex items-center gap-1">
              ← Volver
            </a>
            <h1 className="text-3xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9] font-[family-name:var(--font-syne)]">
              Política de Cookies
            </h1>
            <p className="text-sm text-[#A9B5C2]">Última actualización: 7 de junio de 2026</p>
            <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed">
              Esta política explica qué cookies usamos en Presuply, para qué sirven y cómo puedes controlarlas.
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
