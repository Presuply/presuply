export type PlanKey = 'trial' | 'autonomo' | 'profesional' | 'empresa'

export interface PlanLimits {
  budgetsPerMonth: number | null  // null = ilimitado
  canUseFolders: boolean
  canUseChapters: boolean
  maxUsers: number | null
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  trial: {
    budgetsPerMonth: 3,
    canUseFolders: false,
    canUseChapters: true,
    maxUsers: 1,
  },
  autonomo: {
    budgetsPerMonth: 20,
    canUseFolders: false,
    canUseChapters: true,
    maxUsers: 1,
  },
  profesional: {
    budgetsPerMonth: 50,
    canUseFolders: true,
    canUseChapters: true,
    maxUsers: 3,
  },
  empresa: {
    budgetsPerMonth: null,
    canUseFolders: true,
    canUseChapters: true,
    maxUsers: null,
  },
}

export function getPlanLimits(planKey: PlanKey, isTeam: boolean): PlanLimits {
  if (isTeam) {
    return { budgetsPerMonth: null, canUseFolders: true, canUseChapters: true, maxUsers: null }
  }
  return PLAN_LIMITS[planKey] ?? PLAN_LIMITS.trial
}

export function getPlanDisplayName(planKey: PlanKey): string {
  const names: Record<PlanKey, string> = {
    trial:       'Prueba gratuita',
    autonomo:    'Autónomo',
    profesional: 'Profesional',
    empresa:     'Empresa',
  }
  return names[planKey] ?? 'Prueba gratuita'
}

export const PRICE_TO_PLAN: Record<string, PlanKey> = {
  price_1TeTMaAZvl0udmbsUDbOnY5o: 'autonomo',
  price_1TeTRIAZvl0udmbsHC9CopHe: 'autonomo',
  price_1TeTNjAZvl0udmbsDVLpWAXw: 'profesional',
  price_1TeTTFAZvl0udmbs04lrb9Jc: 'profesional',
  price_1TeTOaAZvl0udmbs4wKetHrV: 'empresa',
  price_1TeTVcAZvl0udmbswrRS2xun: 'empresa',
}
