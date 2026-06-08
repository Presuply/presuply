'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'presuply_cookies_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true)
    } catch {}
  }, [])

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, 'accepted') } catch {}
    setVisible(false)
  }

  function reject() {
    try { localStorage.setItem(CONSENT_KEY, 'rejected') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D1B2A] border-t border-[#3A4A5C] px-4 py-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-[#A9B5C2] flex-1">
          Usamos cookies propias y de terceros para mejorar tu experiencia y analizar el uso de la app.{' '}
          <Link href="/cookies" className="text-[#FF6A00] hover:underline transition-colors">
            Más información
          </Link>
          .
        </p>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={reject}
            className="text-sm text-[#6B7B8C] hover:text-[#F4F6F9] transition-colors px-3 py-2 rounded-[8px] hover:bg-white/5"
          >
            Rechazar no esenciales
          </button>
          <Link
            href="/cookies"
            className="text-sm text-[#6B7B8C] hover:text-[#F4F6F9] transition-colors px-3 py-2 rounded-[8px] hover:bg-white/5"
          >
            Configurar
          </Link>
          <button
            type="button"
            onClick={accept}
            className="bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2 text-sm transition-colors"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  )
}
