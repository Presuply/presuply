import type { Metadata } from 'next'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Política de Cookies — Presuply',
}

const h2Class = 'text-base font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] font-[family-name:var(--font-syne)]'
const pClass = 'text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed'
const ulClass = 'list-disc list-inside space-y-1 text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed'

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
            <p className={pClass}>
              Esta política explica qué cookies usamos en Presuply, para qué sirven y cómo puedes controlarlas.
            </p>
          </header>

          <div className="w-12 h-1 bg-[#FF6A00] rounded-full" />

          <section className="space-y-3">
            <h2 className={h2Class}>1. ¿Qué son las cookies?</h2>
            <p className={pClass}>
              Una cookie es un pequeño archivo de texto que un sitio web instala en el dispositivo del Usuario (ordenador, teléfono móvil, tableta) cuando este accede a sus páginas. Las cookies permiten almacenar y recuperar información sobre los hábitos de navegación y, en función de la información que contengan y de la forma en que se utilice el equipo, pueden utilizarse para reconocer al Usuario.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>2. Tipos de cookies utilizadas en Presuply</h2>
            <p className={pClass}>
              La Aplicación utiliza únicamente las cookies estrictamente necesarias para su correcto funcionamiento, así como, en su caso, cookies analíticas para la mejora del servicio. En particular:
            </p>
            <ul className={ulClass}>
              <li>
                <span className="font-medium text-[#0D1B2A] dark:text-[#F4F6F9]">Cookies técnicas o necesarias:</span>{' '}
                permiten al Usuario navegar por la Aplicación, mantener la sesión iniciada, recordar preferencias básicas y utilizar las funciones esenciales (seguridad, autenticación, gestión de la suscripción). Estas cookies están exentas del deber de consentimiento conforme al artículo 22.2 de la LSSI-CE.
              </li>
              <li>
                <span className="font-medium text-[#0D1B2A] dark:text-[#F4F6F9]">Cookies analíticas:</span>{' '}
                en su caso, permiten al Titular analizar el comportamiento de los Usuarios de forma agregada con el fin de mejorar el servicio. Se instalan únicamente con el consentimiento del Usuario.
              </li>
              <li>
                <span className="font-medium text-[#0D1B2A] dark:text-[#F4F6F9]">Cookies de terceros:</span>{' '}
                determinados servicios externos (Stripe, Supabase, proveedores de analítica) pueden instalar sus propias cookies, sujetas a sus respectivas políticas.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>3. Gestión del consentimiento</h2>
            <p className={pClass}>
              La primera vez que el Usuario accede a la Aplicación, se le muestra un aviso informativo a través del cual puede aceptar, rechazar o configurar el uso de cookies no esenciales. El Usuario puede modificar su preferencia en cualquier momento desde los ajustes de la Aplicación o desde la configuración de su navegador.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>4. Cómo desactivar las cookies</h2>
            <p className={pClass}>
              El Usuario puede impedir la instalación de cookies, así como eliminar las ya instaladas, configurando las opciones de su navegador. Cada navegador ofrece instrucciones específicas en su sección de ayuda. La desactivación de las cookies estrictamente necesarias puede afectar al correcto funcionamiento de Presuply.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>5. Actualizaciones</h2>
            <p className={pClass}>
              El Titular podrá modificar la presente Política de Cookies en cualquier momento para adaptarla a cambios normativos o técnicos. Se recomienda al Usuario revisarla periódicamente.
            </p>
          </section>

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
