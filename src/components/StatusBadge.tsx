import type { BudgetStatus } from '@/types/database'

const CONFIG: Record<BudgetStatus, { label: string; color: string; bg: string }> = {
  borrador:    { label: 'Borrador',    color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  enviado:     { label: 'Enviado',     color: '#3B82F6', bg: 'rgba(59,130,246,0.10)'  },
  aceptado:    { label: 'Aceptado',    color: '#10B981', bg: 'rgba(16,185,129,0.10)'  },
  rechazado:   { label: 'Rechazado',   color: '#EF4444', bg: 'rgba(239,68,68,0.10)'   },
  en_revision: { label: 'En revisión', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)'  },
}

interface StatusBadgeProps {
  status: BudgetStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { label, color, bg } = CONFIG[status] ?? CONFIG.borrador
  const px = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${px}`}
      style={{ backgroundColor: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
