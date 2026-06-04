'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const baseItemClass =
  'flex flex-col items-center justify-center gap-1 flex-1 h-14 rounded-xl transition-colors'

function isDashboardActive(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/presupuesto')
}

export function BottomNav() {
  const pathname = usePathname()
  const dashboardActive = isDashboardActive(pathname)
  const nuevoActive = pathname === '/dashboard/nuevo'
  const perfilActive = pathname === '/dashboard/perfil'

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] sm:hidden">
      <div className="relative bg-white dark:bg-[#1B2A3A] border border-gray-200 dark:border-[#3A4A5C] shadow-sm rounded-2xl px-3 pt-2 pb-3">
        <div className="flex items-end gap-2">
          <Link
            href="/dashboard"
            aria-label="Presupuestos"
            className={[
              baseItemClass,
              dashboardActive
                ? 'text-gray-900 dark:text-[#F4F6F9]'
                : 'text-gray-500 dark:text-[#A9B5C2] hover:text-gray-900 dark:hover:text-[#F4F6F9]',
            ].join(' ')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 10v10a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V10" />
            </svg>
            <span className={dashboardActive ? 'text-sm font-semibold' : 'text-sm'}>
              Presupuestos
            </span>
          </Link>

          <Link
            href="/dashboard/nuevo"
            aria-label="Nuevo presupuesto"
            className="relative flex-1 h-14 flex items-center justify-center"
          >
            <span
              className={[
                'flex items-center justify-center w-14 h-14 rounded-full border border-gray-200 dark:border-[#3A4A5C] shadow-sm transition-colors',
                nuevoActive
                  ? 'bg-gray-900 text-white dark:bg-[#F4F6F9] dark:text-[#0D1B2A]'
                  : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-[#1B2A3A] dark:text-[#F4F6F9] dark:hover:bg-[#223447]',
              ].join(' ')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
          </Link>

          <Link
            href="/dashboard/perfil"
            aria-label="Mi perfil"
            className={[
              baseItemClass,
              perfilActive
                ? 'text-gray-900 dark:text-[#F4F6F9]'
                : 'text-gray-500 dark:text-[#A9B5C2] hover:text-gray-900 dark:hover:text-[#F4F6F9]',
            ].join(' ')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className={perfilActive ? 'text-sm font-semibold' : 'text-sm'}>
              Mi perfil
            </span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
