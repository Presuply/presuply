import type { Metadata } from 'next'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Presuply',
}

const sections = [
  { title: '1. Responsable del tratamiento', body: '[Contenido pendiente]' },
  { title: '2. Datos que recopilamos', body: '[Contenido pendiente]' },
  { title: '3. Finalidad del tratamiento', body: '[Contenido pendiente]' },
  { title: '4. Base jurídica', body: '[Contenido pendiente]' },
  { title: '5. Conservación de los datos', body: '[Contenido pendiente]' },
  { title: '6. Destinatarios y transferencias internacionales', body: '[Contenido pendiente]' },
  { title: '7. Derechos del interesado', body: '[Contenido pendiente]' },
  { title: '8. Seguridad', body: '[Contenido pendiente]' },
  { title: '9. Cambios en esta política', body: '[Contenido pendiente]' },
]

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex flex-col">
      <div className="flex-1 px-4 py-12">
        <article className="max-w-2xl mx-auto space-y-8">

          <header className="space-y-3">
            <a href="/" className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors inline-flex items-center gap-1">
              ← Volver
            </a>
            <h1 className="text-3xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9] font-[family-name:var(--font-syne)]">
              Política de Privacidad
            </h1>
            <p className="text-sm text-[#A9B5C2]">Última actualización: 7 de junio de 2026</p>
            <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed">
              En Presuply nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política explica qué datos recogemos, cómo los usamos y los derechos que te asisten como interesado.
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
