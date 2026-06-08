import Link from 'next/link'
import type { PlanKey } from '@/lib/plans'
import { getPlanDisplayName } from '@/lib/plans'

interface UpgradeGateProps {
  children: React.ReactNode
  feature: string
  planRequired: PlanKey
  currentPlanHasAccess: boolean
}

export default function UpgradeGate({
  children,
  feature,
  planRequired,
  currentPlanHasAccess,
}: UpgradeGateProps) {
  if (currentPlanHasAccess) return <>{children}</>

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 dark:bg-[#0D1B2A]/70 rounded-[12px] backdrop-blur-[2px]">
        <span className="text-xl" aria-hidden>🔒</span>
        <p className="text-xs font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] text-center px-3">
          {feature}
        </p>
        <p className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2] text-center px-3">
          Disponible en plan {getPlanDisplayName(planRequired)}
        </p>
        <Link
          href="/pricing"
          className="mt-1 bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-3 py-1.5 text-xs transition-colors"
        >
          Actualizar plan
        </Link>
      </div>
    </div>
  )
}
