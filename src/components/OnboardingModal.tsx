'use client'

import { useRouter } from 'next/navigation'

const STEPS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    title: 'Sube tu documentación',
    description: 'Sube fotos de la obra, mensajes de WhatsApp o PDFs. La IA extrae automáticamente todas las partidas.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Genera tu presupuesto profesional',
    description: 'Convierte las partidas en descripciones técnicas profesionales con un solo clic. Edita cada partida a tu gusto antes de generar el PDF.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'Exporta en el formato que necesites',
    description: 'Genera un PDF profesional, exporta a Excel, CSV o formato BC3 para Presto y TCQ. Todo desde el mismo sitio.',
  },
]

interface OnboardingModalProps {
  userEmail: string
  onComplete: () => void
}

export default function OnboardingModal({ userEmail, onComplete }: OnboardingModalProps) {
  const router = useRouter()
  const userName = userEmail.split('@')[0]

  function handleStart() {
    onComplete()
    router.push('/dashboard/nuevo')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B2A]/80 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1B2A3A] rounded-[16px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-2xl w-full max-w-lg">

        {/* Cabecera */}
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 border-b border-[#D5DCE4] dark:border-[#3A4A5C]">
          <img src="/images/logo.svg" alt="Presuply" className="h-9 w-auto" />
          <h2 className="text-xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9] text-center font-[family-name:var(--font-syne)]">
            Bienvenido, {userName}
          </h2>
          <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] text-center max-w-sm">
            Presuply convierte tus notas en presupuestos profesionales en segundos. Así de fácil:
          </p>
        </div>

        {/* Pasos */}
        <div className="px-6 py-6 space-y-5">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-[12px] bg-[#FF6A00]/10 dark:bg-[#FF6A00]/15 flex items-center justify-center text-[#FF6A00]">
                {step.icon}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#FF6A00] uppercase tracking-wider">
                    {i + 1}
                  </span>
                  <p className="text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9]">
                    {step.title}
                  </p>
                </div>
                <p className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleStart}
            className="w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-3 text-sm transition-colors"
          >
            Crear mi primer presupuesto
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="w-full text-sm text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9] py-2 transition-colors"
          >
            Explorar el panel
          </button>
        </div>

      </div>
    </div>
  )
}
