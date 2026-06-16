import type { Metadata } from 'next'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Presuply',
}

const h2Class = 'text-base font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] font-[family-name:var(--font-syne)]'
const pClass = 'text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed'
const ulClass = 'list-disc list-inside space-y-1 text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed'

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
            <p className={pClass}>
              En Presuply nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política explica qué datos recogemos, cómo los usamos y los derechos que te asisten como interesado.
            </p>
          </header>

          <div className="w-12 h-1 bg-[#FF6A00] rounded-full" />

          <section className="space-y-3">
            <h2 className={h2Class}>1. Responsable del tratamiento</h2>
            <p className={pClass}>
              De conformidad con lo establecido en el Reglamento (UE) 2016/679 General de Protección de Datos (en adelante, «RGPD») y en la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (en adelante, «LOPDGDD»), se informa al Usuario de que el responsable del tratamiento de sus datos personales es:
            </p>
            <ul className={ulClass}>
              <li>Identidad: GRUPO TOMPECA INVERSIONES SOCIEDADES LIMITADA.</li>
              <li>NIF: B23834344.</li>
              <li>Dirección postal: Camino El Guincho, núm. 264, 38270 San Cristóbal de La Laguna, Santa Cruz de Tenerife (España).</li>
              <li>Correo electrónico: contacto@presuply.app.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>2. Datos personales tratados</h2>
            <p className={pClass}>
              En función del uso que el Usuario haga de Presuply, podrán ser objeto de tratamiento las siguientes categorías de datos personales:
            </p>
            <ul className={ulClass}>
              <li>Datos identificativos y de contacto: nombre, apellidos, dirección de correo electrónico, número de teléfono.</li>
              <li>Datos profesionales y fiscales: razón social, NIF/CIF, dirección fiscal, actividad profesional.</li>
              <li>Datos de cuenta: credenciales de acceso, plan contratado, historial de uso, fecha de alta y baja.</li>
              <li>Datos de facturación y pago: datos necesarios para gestionar las suscripciones, procesados directamente por Stripe; el Titular no almacena los datos completos de tarjetas bancarias.</li>
              <li>Datos de contenido: presupuestos, descripciones, imágenes, archivos PDF y demás documentos que el Usuario suba a la Aplicación, los cuales pueden contener datos personales de terceros (clientes finales del Usuario).</li>
              <li>Datos técnicos y de uso: dirección IP, tipo de dispositivo, navegador, registros de actividad, cookies y tecnologías similares.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>3. Finalidades y bases jurídicas del tratamiento</h2>
            <p className={pClass}>
              Los datos personales recogidos serán tratados con las siguientes finalidades y bases jurídicas:
            </p>
            <ul className={ulClass}>
              <li>Prestación del servicio: gestionar el registro, la cuenta, la generación y almacenamiento de presupuestos, así como cualquier otra funcionalidad de Presuply. Base jurídica: ejecución del contrato (art. 6.1.b RGPD).</li>
              <li>Gestión de la facturación y de los pagos: tramitación de las suscripciones, emisión de facturas y cumplimiento de obligaciones fiscales. Base jurídica: ejecución del contrato y cumplimiento de obligaciones legales (art. 6.1.b y c RGPD).</li>
              <li>Atención al Usuario: dar respuesta a consultas, incidencias y reclamaciones. Base jurídica: ejecución del contrato e interés legítimo (art. 6.1.b y f RGPD).</li>
              <li>Procesamiento mediante inteligencia artificial: análisis de los documentos e imágenes subidos por el Usuario para extraer información y generar borradores de presupuestos. Base jurídica: ejecución del contrato (art. 6.1.b RGPD).</li>
              <li>Comunicaciones comerciales: envío de información sobre novedades, mejoras del producto y ofertas relacionadas con Presuply. Base jurídica: consentimiento del Usuario (art. 6.1.a RGPD), revocable en cualquier momento.</li>
              <li>Mejora del servicio y análisis estadístico: estudio del uso de la Aplicación para optimizar su funcionamiento, mediante datos preferentemente agregados o anonimizados. Base jurídica: interés legítimo (art. 6.1.f RGPD).</li>
              <li>Cumplimiento de obligaciones legales: atención a requerimientos de autoridades, prevención del fraude y conservación de información conforme a la normativa aplicable. Base jurídica: cumplimiento de obligaciones legales (art. 6.1.c RGPD).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>4. Tratamiento de datos de terceros (clientes finales del Usuario)</h2>
            <p className={pClass}>
              Cuando el Usuario introduzca en Presuply datos personales de terceros (por ejemplo, datos identificativos o de contacto de sus clientes), el Usuario actúa como responsable del tratamiento respecto de dichos datos, y el Titular actúa como encargado del tratamiento, limitándose a tratarlos para la prestación del servicio.
            </p>
            <p className={pClass}>
              El Usuario garantiza que dispone de la base jurídica suficiente para introducir y tratar dichos datos en Presuply, y que ha informado debidamente a los titulares de los mismos. El Usuario será el único responsable frente a terceros y frente a las autoridades de control por el cumplimiento de la normativa de protección de datos respecto de los datos que él mismo introduzca.
            </p>
            <p className={pClass}>
              Las condiciones del encargo del tratamiento se entienden incorporadas en las presentes condiciones, conforme al artículo 28 del RGPD, y podrán ser desarrolladas mediante un acuerdo de encargo del tratamiento específico cuando así lo requiera la actividad del Usuario.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>5. Destinatarios y encargados del tratamiento</h2>
            <p className={pClass}>
              Para la prestación del servicio, el Titular utiliza proveedores externos que actúan como encargados del tratamiento, todos ellos seleccionados conforme a los criterios exigidos por el RGPD. Los principales son:
            </p>
            <ul className={ulClass}>
              <li>Supabase, Inc. (Estados Unidos): infraestructura de base de datos y autenticación.</li>
              <li>Vercel, Inc. (Estados Unidos): alojamiento de la Aplicación.</li>
              <li>Anthropic, PBC (Estados Unidos): proveedor de modelos de inteligencia artificial empleados para el procesamiento de los contenidos del Usuario.</li>
              <li>Stripe Payments Europe, Ltd. (Irlanda) y filiales: tramitación de los pagos.</li>
              <li>Proveedores de envío de correo electrónico transaccional, herramientas de analítica web y soporte técnico, en su caso.</li>
            </ul>
            <p className={pClass}>
              Asimismo, los datos podrán ser comunicados a las Administraciones Públicas, autoridades fiscales y órganos jurisdiccionales cuando exista una obligación legal de hacerlo.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>6. Transferencias internacionales de datos</h2>
            <p className={pClass}>
              Algunos de los proveedores indicados se encuentran establecidos fuera del Espacio Económico Europeo, principalmente en Estados Unidos. Dichas transferencias se realizan amparadas en las garantías previstas en el RGPD, en particular mediante la suscripción de Cláusulas Contractuales Tipo aprobadas por la Comisión Europea o, en su caso, mediante mecanismos de certificación equivalentes (como el EU-US Data Privacy Framework, cuando resulte aplicable).
            </p>
            <p className={pClass}>
              El Usuario puede solicitar información adicional sobre las garantías aplicadas a través del correo de contacto.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>7. Plazo de conservación</h2>
            <p className={pClass}>
              Los datos personales se conservarán durante el tiempo necesario para cumplir con la finalidad para la que fueron recogidos y, en todo caso, durante los plazos legales aplicables. En particular:
            </p>
            <ul className={ulClass}>
              <li>Los datos de cuenta se conservarán mientras el Usuario mantenga activa su suscripción y, tras la baja, durante los plazos legales pertinentes para atender posibles responsabilidades.</li>
              <li>Los datos de facturación se conservarán durante los plazos exigidos por la normativa fiscal y mercantil (con carácter general, seis años).</li>
              <li>Los datos de los presupuestos almacenados podrán ser eliminados por el Usuario en cualquier momento desde la Aplicación; en caso de cancelación de cuenta, serán suprimidos transcurridos los plazos de conservación legales.</li>
              <li>Los datos tratados con fines de marketing se conservarán hasta que el Usuario revoque su consentimiento.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>8. Derechos del Usuario</h2>
            <p className={pClass}>
              El Usuario podrá ejercer en cualquier momento los siguientes derechos reconocidos por la normativa de protección de datos:
            </p>
            <ul className={ulClass}>
              <li>Derecho de acceso a sus datos personales.</li>
              <li>Derecho de rectificación de los datos inexactos.</li>
              <li>Derecho de supresión («derecho al olvido»).</li>
              <li>Derecho a la limitación del tratamiento.</li>
              <li>Derecho a la portabilidad de los datos.</li>
              <li>Derecho de oposición al tratamiento.</li>
              <li>Derecho a no ser objeto de decisiones individuales automatizadas con efectos jurídicos.</li>
              <li>Derecho a revocar los consentimientos otorgados, en cualquier momento.</li>
            </ul>
            <p className={pClass}>
              Los derechos podrán ejercerse enviando una solicitud por escrito a la dirección postal indicada en el apartado 1 o al correo electrónico contacto@presuply.app, indicando el derecho que se desea ejercer y aportando, en su caso, copia del documento identificativo del Usuario.
            </p>
            <p className={pClass}>
              Asimismo, el Usuario tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es) si considera que el tratamiento de sus datos no se ajusta a la normativa vigente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>9. Seguridad de los datos</h2>
            <p className={pClass}>
              El Titular ha adoptado las medidas técnicas y organizativas necesarias para garantizar la seguridad, integridad y confidencialidad de los datos personales tratados, así como para prevenir su alteración, pérdida, tratamiento o acceso no autorizado, teniendo en cuenta el estado de la técnica, los costes de aplicación y la naturaleza, alcance, contexto y fines del tratamiento.
            </p>
            <p className={pClass}>
              En particular, los datos se almacenan en sistemas con cifrado en tránsito (HTTPS/TLS) y en reposo, y el acceso a los mismos se encuentra restringido al personal autorizado y a los encargados del tratamiento estrictamente necesarios.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>10. Modificaciones de la Política de Privacidad</h2>
            <p className={pClass}>
              El Titular podrá actualizar la presente Política de Privacidad para adaptarla a cambios legislativos, técnicos o de funcionamiento del servicio. Las modificaciones serán comunicadas al Usuario a través de la propia Aplicación o por correo electrónico con una antelación razonable, indicando en todo caso la fecha de la última actualización.
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
