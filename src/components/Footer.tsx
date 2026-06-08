import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#0D1B2A] px-4 py-6 mt-auto">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[#A9B5C2]">
          © 2026 Grupo Tompeca Inversiones S.L.
        </p>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href="/terminos" className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors">
            Términos y Condiciones
          </Link>
          <Link href="/privacidad" className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors">
            Política de Privacidad
          </Link>
          <Link href="/cookies" className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors">
            Política de Cookies
          </Link>
          <a href="mailto:contacto@presuply.app" className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors">
            Contacto
          </a>
        </nav>
      </div>
    </footer>
  )
}
