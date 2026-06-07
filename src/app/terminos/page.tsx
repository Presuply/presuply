import type { Metadata } from 'next'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Presuply',
}

const h2Class = 'text-base font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] font-[family-name:var(--font-syne)]'
const pClass = 'text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed'
const ulClass = 'list-disc list-inside space-y-1 text-sm text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed'

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
            <p className={pClass}>
              Por favor, lee atentamente estos Términos y Condiciones antes de usar Presuply. Al crear una cuenta o usar el servicio, aceptas quedar vinculado por estos términos.
            </p>
          </header>

          <div className="w-12 h-1 bg-[#FF6A00] rounded-full" />

          <section className="space-y-3">
            <h2 className={h2Class}>1. Información general</h2>
            <p className={pClass}>
              En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa a los usuarios de los siguientes datos identificativos del titular del sitio web y de la aplicación Presuply (en adelante, «Presuply» o «la Aplicación»):
            </p>
            <ul className={ulClass}>
              <li>Titular: GRUPO TOMPECA INVERSIONES SOCIEDADES LIMITADA (en adelante, «el Titular»).</li>
              <li>NIF: B23834344.</li>
              <li>Domicilio social: Camino El Guincho, núm. 264, 38270 San Cristóbal de La Laguna, Santa Cruz de Tenerife (España).</li>
              <li>Correo electrónico de contacto: contacto@presuply.app.</li>
              <li>Dominio web: presuply.app.</li>
            </ul>
            <p className={pClass}>
              El Titular es responsable de la explotación de Presuply y mantiene la titularidad de la marca comercial «Presuply», sin perjuicio de los derechos derivados de la futura titularidad por parte de Piperon Labs, S.L., una vez completada su constitución y la cesión de los derechos correspondientes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>2. Objeto</h2>
            <p className={pClass}>
              El presente Aviso Legal y las Condiciones de Uso (en adelante, «las Condiciones») regulan el acceso, navegación y utilización de Presuply, una aplicación web destinada a la generación, gestión y exportación de presupuestos profesionales para autónomos, pequeñas y medianas empresas, mediante el uso de tecnologías de inteligencia artificial.
            </p>
            <p className={pClass}>
              La utilización de Presuply atribuye la condición de usuario (en adelante, «el Usuario») e implica la aceptación plena y sin reservas de todas las disposiciones incluidas en las presentes Condiciones, así como de la Política de Privacidad y de la Política de Cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>3. Acceso y registro</h2>
            <p className={pClass}>
              El acceso a Presuply requiere el registro previo del Usuario mediante la creación de una cuenta con una dirección de correo electrónico válida y una contraseña. El Usuario garantiza que los datos facilitados son veraces, exactos y completos, y se compromete a mantenerlos actualizados.
            </p>
            <p className={pClass}>
              El Usuario es el único responsable de la custodia de sus credenciales de acceso y de cualquier actividad realizada desde su cuenta. En caso de uso no autorizado de la misma, deberá notificarlo de inmediato al Titular a través del correo de contacto.
            </p>
            <p className={pClass}>
              El registro y uso de Presuply está reservado a personas mayores de edad con capacidad legal para contratar.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>4. Periodo de prueba y planes de suscripción</h2>
            <p className={pClass}>
              Presuply ofrece un periodo de prueba gratuito limitado a tres (3) presupuestos por cuenta. Una vez agotado el periodo de prueba, el acceso continuado a las funcionalidades de la Aplicación requiere la contratación de uno de los planes de suscripción ofrecidos:
            </p>
            <ul className={ulClass}>
              <li>Plan Autónomo: 49 € al mes (o equivalente con descuento anual).</li>
              <li>Plan Profesional: 99 € al mes (o equivalente con descuento anual).</li>
              <li>Plan Empresa: 249 € al mes (o equivalente con descuento anual).</li>
            </ul>
            <p className={pClass}>
              Los precios anteriores se entienden con los impuestos indirectos aplicables incluidos o desglosados conforme a la normativa fiscal vigente y al domicilio de facturación del Usuario.
            </p>
            <p className={pClass}>
              La contratación, renovación, modificación y cancelación de las suscripciones se realiza a través de la propia Aplicación. Las cuotas se cobrarán de forma anticipada mediante el proveedor de pagos Stripe Payments Europe, Ltd., en cada periodo de facturación, hasta que el Usuario cancele su suscripción.
            </p>
            <p className={pClass}>
              La cancelación tendrá efecto al finalizar el periodo de facturación en curso, manteniéndose el acceso al servicio hasta dicha fecha. No se contemplan reembolsos por periodos parcialmente utilizados, salvo obligación legal en contrario.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>5. Derecho de desistimiento</h2>
            <p className={pClass}>
              De acuerdo con el artículo 103.m del Real Decreto Legislativo 1/2007, por el que se aprueba el texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios, el Usuario que tenga la consideración de consumidor reconoce que, al tratarse de un servicio digital de ejecución inmediata, una vez iniciada la prestación del servicio mediante el acceso a la cuenta, no podrá ejercer el derecho de desistimiento sobre los periodos ya consumidos. El Usuario presta su consentimiento expreso a la prestación inmediata del servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>6. Uso correcto de la Aplicación</h2>
            <p className={pClass}>
              El Usuario se compromete a utilizar Presuply de conformidad con la ley, las presentes Condiciones, la moral y el orden público, y a no emplearla con fines ilícitos o contrarios a los intereses del Titular o de terceros. En particular, el Usuario se obliga a no:
            </p>
            <ul className={ulClass}>
              <li>Introducir en la Aplicación contenidos falsos, difamatorios, ofensivos, obscenos, discriminatorios o que infrinjan derechos de terceros.</li>
              <li>Subir documentos, imágenes o cualquier otro material sobre el que no ostente los derechos necesarios para su tratamiento.</li>
              <li>Realizar actividades que puedan dañar, sobrecargar, deteriorar o impedir el normal funcionamiento de la Aplicación.</li>
              <li>Intentar acceder de forma no autorizada a cuentas, sistemas o redes vinculadas a Presuply.</li>
              <li>Utilizar la Aplicación para enviar comunicaciones comerciales no solicitadas (spam).</li>
              <li>Realizar ingeniería inversa, descompilar, desensamblar o intentar extraer el código fuente de la Aplicación, salvo en los supuestos legalmente permitidos.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>7. Inteligencia artificial y limitaciones del servicio</h2>
            <p className={pClass}>
              Presuply utiliza modelos de inteligencia artificial proporcionados por proveedores externos, en particular Anthropic, PBC («Claude»), para procesar la información introducida por el Usuario y generar borradores de presupuestos. El Usuario reconoce y acepta que:
            </p>
            <ul className={ulClass}>
              <li>Los resultados generados por los modelos de inteligencia artificial son aproximaciones y pueden contener errores, omisiones o imprecisiones.</li>
              <li>La revisión, validación y firma final de cualquier presupuesto generado a través de Presuply es responsabilidad exclusiva del Usuario, que actúa como profesional en sus relaciones con sus clientes.</li>
              <li>El Titular no garantiza la exactitud, integridad ni adecuación de los presupuestos generados para un fin concreto, y no será responsable de las decisiones comerciales adoptadas por el Usuario o de las relaciones contractuales entre el Usuario y sus clientes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>8. Propiedad intelectual e industrial</h2>
            <p className={pClass}>
              Todos los derechos de propiedad intelectual e industrial sobre Presuply, incluyendo, a título enunciativo y no limitativo, el software, el código fuente, el diseño, la marca, el logotipo, los textos, las imágenes y demás elementos que la integran, son titularidad del Titular o de los terceros que hayan autorizado su uso, y se encuentran protegidos por la legislación nacional e internacional aplicable.
            </p>
            <p className={pClass}>
              La concesión de acceso a la Aplicación no implica, en ningún caso, cesión, renuncia, transmisión o licencia total o parcial de dichos derechos a favor del Usuario, salvo el derecho estrictamente necesario para el uso de Presuply conforme a las presentes Condiciones.
            </p>
            <p className={pClass}>
              El Usuario conserva la titularidad de los contenidos que introduzca en la Aplicación (datos de clientes, descripciones, fotografías, documentos, etc.). Mediante la utilización del servicio, el Usuario concede al Titular una licencia limitada, no exclusiva y libre de regalías, para procesar dichos contenidos con la única finalidad de prestar el servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>9. Disponibilidad y modificaciones del servicio</h2>
            <p className={pClass}>
              El Titular realizará sus mejores esfuerzos para garantizar la disponibilidad continua y la correcta prestación del servicio, sin perjuicio de las interrupciones por mantenimiento, actualizaciones, incidencias técnicas o causas de fuerza mayor.
            </p>
            <p className={pClass}>
              El Titular se reserva el derecho a modificar, suspender, limitar o discontinuar, total o parcialmente, las funcionalidades de Presuply, así como a actualizar los precios y planes de suscripción, comunicando dichos cambios al Usuario con una antelación razonable a través de la propia Aplicación o por correo electrónico.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>10. Limitación de responsabilidad</h2>
            <p className={pClass}>
              En la máxima medida permitida por la ley, el Titular no será responsable de los daños indirectos, lucro cesante, pérdida de datos, pérdida de oportunidades comerciales o cualesquiera otros perjuicios derivados de:
            </p>
            <ul className={ulClass}>
              <li>El uso o la imposibilidad de uso de la Aplicación.</li>
              <li>Errores, inexactitudes u omisiones en los presupuestos generados mediante inteligencia artificial.</li>
              <li>Interrupciones del servicio, fallos técnicos, virus o accesos no autorizados imputables a terceros.</li>
              <li>La actuación de los proveedores tecnológicos externos utilizados para la prestación del servicio (alojamiento, pagos, inteligencia artificial).</li>
            </ul>
            <p className={pClass}>
              En todo caso, la responsabilidad total acumulada del Titular frente al Usuario, por cualquier concepto, quedará limitada al importe efectivamente abonado por este último en concepto de suscripción durante los doce (12) meses anteriores al hecho que origine la reclamación.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>11. Suspensión y terminación</h2>
            <p className={pClass}>
              El Titular se reserva el derecho a suspender o cancelar la cuenta del Usuario, sin derecho a indemnización, en caso de incumplimiento grave de las presentes Condiciones, uso fraudulento o abusivo del servicio, impago de las cuotas de suscripción o solicitud de las autoridades competentes.
            </p>
            <p className={pClass}>
              El Usuario podrá dar de baja su cuenta en cualquier momento, a través de la propia Aplicación o solicitándolo al correo de contacto. La baja conlleva la eliminación de la cuenta y, transcurridos los plazos legales de conservación, de los datos asociados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>12. Modificación de las Condiciones</h2>
            <p className={pClass}>
              El Titular podrá modificar las presentes Condiciones para adaptarlas a cambios normativos, técnicos, de mercado o de funcionamiento del servicio. Las modificaciones serán comunicadas al Usuario con una antelación razonable y entrarán en vigor en la fecha indicada. La continuación en el uso de Presuply tras dicha fecha implicará la aceptación de las nuevas Condiciones.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2Class}>13. Legislación aplicable y jurisdicción</h2>
            <p className={pClass}>
              Las presentes Condiciones se rigen por la legislación española. Para la resolución de cualquier controversia derivada de la interpretación, ejecución o cumplimiento de las mismas, las partes se someten, con renuncia expresa a cualquier otro fuero que pudiera corresponderles, a los Juzgados y Tribunales del domicilio del consumidor, conforme a la normativa de defensa de consumidores y usuarios. Para Usuarios no consumidores, las partes se someten a los Juzgados y Tribunales de Santa Cruz de Tenerife.
            </p>
            <p className={pClass}>
              De conformidad con el Reglamento (UE) n.º 524/2013, se informa al Usuario consumidor de la existencia de una plataforma europea de resolución de litigios en línea, accesible en la siguiente dirección:{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#FF6A00] hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>.
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
