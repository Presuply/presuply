'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Tooltip from '@/components/Tooltip'
import { usePageTooltips } from '@/hooks/usePageTooltips'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeProvider'
import { getPlanLimits, getPlanDisplayName, type PlanKey } from '@/lib/plans'

interface ProfileForm {
  full_name: string
  company_name: string
  nif: string
  address: string
  phone: string
  iban: string
  invoice_prefix: string
  logo_url: string | null
  template_url: string | null
}

const inputClass =
  'w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-[#FF6A00] transition-colors'

export default function PerfilPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ProfileForm>({
    full_name: '',
    company_name: '',
    nif: '',
    address: '',
    phone: '',
    iban: '',
    invoice_prefix: '',
    logo_url: null,
    template_url: null,
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoDisplayUrl, setLogoDisplayUrl] = useState<string | null>(null)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [analyzingTemplate, setAnalyzingTemplate] = useState(false)
  const [templateSchemaReady, setTemplateSchemaReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [planKey, setPlanKey] = useState<PlanKey>('trial')
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial')
  const [budgetsUsed, setBudgetsUsed] = useState(0)
  const [budgetsThisMonth, setBudgetsThisMonth] = useState(0)
  const [isTeam, setIsTeam] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<{ id: string; email: string; created_at: string }[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberPassword, setNewMemberPassword] = useState('')
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null)
  const [creatingMember, setCreatingMember] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile({
          full_name: data.full_name ?? '',
          company_name: data.company_name ?? '',
          nif: data.nif ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          iban: data.iban ?? '',
          invoice_prefix: data.invoice_prefix ?? '',
          logo_url: data.logo_url,
          template_url: data.template_url,
        })
        if (data.template_schema) setTemplateSchemaReady(true)
        setPlanKey((data.plan_key ?? 'trial') as PlanKey)
        setSubscriptionStatus(data.subscription_status ?? 'trial')
        setBudgetsUsed(data.budgets_used ?? 0)
        setBudgetsThisMonth(data.budgets_this_month ?? 0)
        setIsTeam(data.is_team ?? false)

        if (data.logo_url) {
          const { data: signed } = await supabase.storage
            .from('logos')
            .createSignedUrl(data.logo_url, 3600)
          if (signed?.signedUrl) setLogoDisplayUrl(signed.signedUrl)
        }
      }

      setLoading(false)
    }

    load()
  }, [router])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoDisplayUrl(URL.createObjectURL(file))
  }

  function handleTemplateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setTemplateFile(file)
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const supabase = createClient()
    let newLogoUrl = profile.logo_url
    let newTemplateUrl = profile.template_url

    if (logoFile) {
      const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const storagePath = `${userId}/logo-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(storagePath, logoFile)
      if (uploadError) {
        setError('No se pudo subir el logo. Inténtalo de nuevo.')
        setSaving(false)
        return
      }
      newLogoUrl = storagePath
      setLogoFile(null)
    }

    if (templateFile) {
      const ext = templateFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const storagePath = `${userId}/template.${ext}`
      // upsert: true sobreescribe si ya existía una plantilla anterior
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(storagePath, templateFile, { upsert: true })
      if (uploadError) {
        setError('No se pudo subir la plantilla. Inténtalo de nuevo.')
        setSaving(false)
        return
      }
      newTemplateUrl = storagePath
      setTemplateFile(null)
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name || null,
        company_name: profile.company_name || null,
        nif: profile.nif || null,
        address: profile.address || null,
        phone: profile.phone || null,
        iban: profile.iban || null,
        invoice_prefix: profile.invoice_prefix || null,
        logo_url: newLogoUrl,
        template_url: newTemplateUrl,
      })
      .eq('id', userId)

    if (updateError) {
      setError('Error al guardar el perfil. Inténtalo de nuevo.')
      setSaving(false)
      return
    }

    setProfile(prev => ({ ...prev, logo_url: newLogoUrl, template_url: newTemplateUrl }))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)

    // Si se subió plantilla nueva, analizar en background sin bloquear el save
    if (templateFile && newTemplateUrl) {
      handleAnalyzeTemplate(newTemplateUrl)
    }
  }

  async function handleAnalyzeTemplate(templateUrl: string) {
    setAnalyzingTemplate(true)
    setTemplateSchemaReady(false)
    try {
      const res = await fetch('/api/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateUrl }),
      })
      if (res.ok) setTemplateSchemaReady(true)
    } catch {
      // Error silencioso — el badge simplemente no aparece
    } finally {
      setAnalyzingTemplate(false)
    }
  }

  function update(field: keyof ProfileForm, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  // Cargar equipo cuando el plan lo permite
  useEffect(() => {
    if (planKey !== 'profesional' && planKey !== 'empresa' && !isTeam) return
    setTeamLoading(true)
    fetch('/api/team')
      .then(r => r.json())
      .then(d => { if (d.members) setTeamMembers(d.members) })
      .finally(() => setTeamLoading(false))
  }, [planKey, isTeam])

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    setTeamError(null)
    setTeamSuccess(null)
    if (newMemberPassword.length < 8) {
      setTeamError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setCreatingMember(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail, password: newMemberPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msgs: Record<string, string> = {
          plan_no_teams: 'Tu plan no incluye equipos.',
          member_limit_reached: 'Has alcanzado el límite de miembros de tu plan.',
        }
        setTeamError(msgs[data.error] ?? data.error ?? 'Error al crear el miembro.')
      } else {
        setTeamSuccess(`Cuenta creada para ${data.email}.`)
        setNewMemberEmail('')
        setNewMemberPassword('')
        // Recargar lista
        const r = await fetch('/api/team')
        const d = await r.json()
        if (d.members) setTeamMembers(d.members)
      }
    } finally {
      setCreatingMember(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!window.confirm('¿Eliminar este miembro? Sus presupuestos pasarán a tu cuenta.')) return
    setRemovingMemberId(memberId)
    setTeamError(null)
    try {
      const res = await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m.id !== memberId))
      } else {
        const d = await res.json()
        setTeamError(d.error ?? 'Error al eliminar el miembro.')
      }
    } finally {
      setRemovingMemberId(null)
    }
  }

  async function handlePortal() {
    setOpeningPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setOpeningPortal(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Nombre del archivo de plantilla para mostrar al usuario
  const { activeId: tooltipId, markSeen, skipAll: skipTour } =
    usePageTooltips(['perf_sub', 'perf_team'])

  const templateDisplayName = templateFile?.name
    ?? (profile.template_url ? profile.template_url.split('/').pop() : null)

  const sec = 'bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm p-4 sm:p-6 space-y-4'
  const secTitle = 'text-xs font-bold text-[#6B7B8C] dark:text-[#A9B5C2] uppercase tracking-wider'
  const lbl = 'block text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2]'
  const fileBtn = 'inline-block border border-[#D5DCE4] dark:border-[#3A4A5C] bg-[#EDF0F4] dark:bg-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-3 py-2 text-sm font-medium cursor-pointer transition-colors'

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center">
        <p className="text-sm text-[#A9B5C2] italic">Cargando perfil...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A]">
      <div className="bg-white dark:bg-[#1B2A3A] border-b border-[#D5DCE4] dark:border-[#3A4A5C] px-4 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-[#6B7B8C] hover:text-[#FF6A00] text-sm transition-colors">
          ← Volver
        </a>
        <h1 className="text-lg font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Mi perfil</h1>
      </div>

      <div className="px-4 py-6 max-w-xl mx-auto space-y-6">

        {/* Logo */}
        <section className={sec}>
          <h2 className={secTitle}>Logo de empresa</h2>
          <div className="flex items-center gap-4">
            {logoDisplayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoDisplayUrl} alt="Logo"
                className="w-20 h-20 object-contain rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] bg-[#F4F6F9] dark:bg-[#0D1B2A]" />
            ) : (
              <div className="w-20 h-20 rounded-[12px] border-2 border-dashed border-[#D5DCE4] dark:border-[#3A4A5C] flex items-center justify-center text-[#A9B5C2] text-xs">
                Sin logo
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="logo" className={fileBtn}>
                {logoDisplayUrl ? 'Cambiar logo' : 'Subir logo'}
              </label>
              <input id="logo" type="file" accept="image/*" onChange={handleLogoChange} className="sr-only" />
              <p className="text-xs text-[#A9B5C2]">PNG, JPG o SVG. Se verá en el PDF.</p>
            </div>
          </div>
        </section>

        {/* Plantilla */}
        <section className={`${sec} !space-y-3`}>
          <h2 className={secTitle}>Plantilla de presupuesto</h2>
          <p className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2]">
            Sube una foto o PDF de tu presupuesto actual. Claude analizará tu estilo y lo aplicará a todas las extracciones futuras.
          </p>

          {/* Badge de estado del análisis */}
          {analyzingTemplate && (
            <div className="flex items-center gap-2 rounded-[8px] bg-orange-50 dark:bg-orange-900/15 border border-[#FF6A00]/30 px-3 py-2">
              <svg className="animate-spin w-3.5 h-3.5 text-[#FF6A00] shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs text-[#FF6A00] font-medium">Analizando plantilla con IA...</span>
            </div>
          )}
          {templateSchemaReady && !analyzingTemplate && (
            <div className="flex items-center justify-between gap-3 rounded-[8px] bg-green-50 dark:bg-green-900/15 border border-[#1FB57A]/30 px-3 py-2">
              <span className="text-xs text-[#1FB57A] font-medium">
                Plantilla configurada — tus presupuestos seguirán siempre el mismo esquema
              </span>
              {profile.template_url && (
                <button
                  type="button"
                  onClick={() => handleAnalyzeTemplate(profile.template_url!)}
                  className="shrink-0 text-xs text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors whitespace-nowrap"
                >
                  Reanalizar
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <label htmlFor="template" className={`${fileBtn} shrink-0`}>
              {templateDisplayName ? 'Cambiar plantilla' : 'Subir plantilla'}
            </label>
            <input id="template" type="file" accept="image/*,application/pdf"
              onChange={handleTemplateChange} className="sr-only" />
            {templateDisplayName && (
              <span className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] truncate">{templateDisplayName}</span>
            )}
          </div>
          {!templateDisplayName && (
            <p className="text-xs text-[#A9B5C2]">JPG, PNG o PDF. Si no subes plantilla, se usará una plantilla estándar.</p>
          )}
        </section>

        {/* Datos de empresa */}
        <section className={sec}>
          <h2 className={secTitle}>Datos de empresa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={lbl}>Nombre completo</label>
              <input type="text" value={profile.full_name}
                onChange={e => update('full_name', e.target.value)}
                placeholder="Tu nombre" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Empresa</label>
              <input type="text" value={profile.company_name}
                onChange={e => update('company_name', e.target.value)}
                placeholder="Nombre de empresa o autónomo" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>NIF / CIF</label>
              <input type="text" value={profile.nif}
                onChange={e => update('nif', e.target.value)}
                placeholder="12345678A" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Teléfono</label>
              <input type="tel" value={profile.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="600 000 000" className={inputClass} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={lbl}>Dirección</label>
              <input type="text" value={profile.address}
                onChange={e => update('address', e.target.value)}
                placeholder="Calle, número, localidad, provincia" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Email (cuenta)</label>
              <input type="email" value={email} disabled
                className="w-full bg-[#EDF0F4] dark:bg-[#3A4A5C] border border-[#D5DCE4] dark:border-[#3A4A5C] rounded-[8px] px-3 py-2 text-sm text-[#A9B5C2]" />
            </div>
            <div className="space-y-1">
              <label className={lbl}>IBAN</label>
              <input type="text" value={profile.iban}
                onChange={e => update('iban', e.target.value)}
                placeholder="ES00 0000 0000 00 0000000000" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Prefijo de factura</label>
              <input type="text" value={profile.invoice_prefix}
                onChange={e => update('invoice_prefix', e.target.value)}
                placeholder="Ej. 26" className={inputClass} />
            </div>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
            {error}
          </p>
        )}

        {saved && (
          <p className="rounded-[8px] bg-green-50 dark:bg-green-900/20 border border-[#1FB57A]/40 px-4 py-3 text-sm text-[#1FB57A]">
            Perfil guardado correctamente.
          </p>
        )}

        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 transition-colors">
          {saving ? 'Guardando...' : 'Guardar perfil'}
        </button>

        {/* Mi suscripción */}
        {(() => {
          const limits = getPlanLimits(planKey, isTeam)
          const isTrial = planKey === 'trial' && !isTeam
          const monthlyLimit = limits.budgetsPerMonth
          const usedThisMonth = budgetsThisMonth
          const progressPct = monthlyLimit ? Math.min(100, Math.round((usedThisMonth / monthlyLimit) * 100)) : 0
          const hasSubscription = ['trialing', 'active', 'past_due'].includes(subscriptionStatus)

          const planColors: Record<string, string> = {
            trial:       'bg-[#EDF0F4] dark:bg-[#3A4A5C] text-[#6B7B8C] dark:text-[#A9B5C2]',
            autonomo:    'bg-[#3E7BFA]/15 text-[#3E7BFA]',
            profesional: 'bg-[#1FB57A]/15 text-[#1FB57A]',
            empresa:     'bg-[#9B59B6]/15 text-[#9B59B6]',
          }
          const badgeClass = isTeam ? 'bg-[#FF6A00]/15 text-[#FF6A00]' : (planColors[planKey] ?? planColors.trial)

          return (
            <section className={sec}>
              <div className="relative inline-block">
                <h2 className={secTitle}>Mi suscripción</h2>
                <Tooltip
                  content="Gestiona tu plan o cancela cuando quieras"
                  placement="right"
                  isActive={tooltipId === 'perf_sub'}
                  onDismiss={() => markSeen('perf_sub')}
                  onSkipAll={skipTour}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}>
                  {isTeam ? 'Equipo' : getPlanDisplayName(planKey)}
                </span>
                {subscriptionStatus === 'past_due' && (
                  <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-[#E5484D]">
                    Pago pendiente
                  </span>
                )}
              </div>

              {isTrial ? (
                <div className="space-y-1">
                  <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
                    Te quedan <strong className="text-[#0D1B2A] dark:text-[#F4F6F9]">{Math.max(0, 3 - budgetsUsed)}</strong> de 3 presupuestos gratuitos.
                  </p>
                  <div className="w-full bg-[#EDF0F4] dark:bg-[#3A4A5C] rounded-full h-2">
                    <div className="bg-[#FF6A00] rounded-full h-2 transition-all" style={{ width: `${Math.min(100, Math.round((budgetsUsed / 3) * 100))}%` }} />
                  </div>
                </div>
              ) : monthlyLimit !== null ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#6B7B8C] dark:text-[#A9B5C2]">
                    <span>Presupuestos este mes</span>
                    <span className="font-semibold text-[#0D1B2A] dark:text-[#F4F6F9]">{usedThisMonth} / {monthlyLimit}</span>
                  </div>
                  <div className="w-full bg-[#EDF0F4] dark:bg-[#3A4A5C] rounded-full h-2">
                    <div
                      className={`rounded-full h-2 transition-all ${progressPct >= 90 ? 'bg-[#E5484D]' : progressPct >= 70 ? 'bg-[#F5A623]' : 'bg-[#1FB57A]'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">Presupuestos ilimitados.</p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {hasSubscription && (
                  <button type="button" onClick={handlePortal} disabled={openingPortal}
                    className="flex-1 border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-4 py-2.5 text-sm font-medium disabled:opacity-40 transition-colors">
                    {openingPortal ? 'Abriendo...' : 'Gestionar suscripción'}
                  </button>
                )}
                <Link href="/pricing"
                  className="flex-1 bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2.5 text-sm text-center transition-colors">
                  {isTrial ? 'Activar plan' : 'Ver todos los planes'}
                </Link>
              </div>

              {/* Subsección equipo */}
              {(planKey === 'profesional' || planKey === 'empresa' || isTeam) && (() => {
                const limits = getPlanLimits(planKey, isTeam)
                const maxMembers = limits.maxUsers !== null ? limits.maxUsers - 1 : null
                const limitReached = maxMembers !== null && teamMembers.length >= maxMembers
                return (
                  <div className="border-t border-[#D5DCE4] dark:border-[#3A4A5C] pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="relative inline-block">
                        <p className="text-xs font-bold text-[#6B7B8C] dark:text-[#A9B5C2] uppercase tracking-wider">Equipo</p>
                        <Tooltip
                          content="Invita a tu equipo a colaborar en tus presupuestos"
                          placement="right"
                          isActive={tooltipId === 'perf_team'}
                          onDismiss={() => markSeen('perf_team')}
                          onSkipAll={skipTour}
                        />
                      </div>
                      <p className="text-xs text-[#A9B5C2]">
                        {teamMembers.length} de {maxMembers !== null ? maxMembers : '∞'} miembros
                      </p>
                    </div>

                    {teamLoading ? (
                      <p className="text-xs text-[#A9B5C2] italic">Cargando...</p>
                    ) : teamMembers.length > 0 ? (
                      <ul className="space-y-2">
                        {teamMembers.map(m => (
                          <li key={m.id} className="flex items-center justify-between gap-2 bg-[#F4F6F9] dark:bg-[#0D1B2A] rounded-[8px] px-3 py-2">
                            <span className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9] truncate">{m.email}</span>
                            <button type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              disabled={removingMemberId === m.id}
                              className="shrink-0 text-[#A9B5C2] hover:text-[#E5484D] disabled:opacity-40 transition-colors text-xs font-bold px-1">
                              {removingMemberId === m.id ? '...' : '✕'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#A9B5C2] italic">Sin miembros todavía.</p>
                    )}

                    {limitReached ? (
                      <p className="text-xs text-[#A9B5C2] bg-[#F4F6F9] dark:bg-[#0D1B2A] rounded-[8px] px-3 py-2">
                        Límite de miembros alcanzado. Actualiza tu plan para añadir más.
                      </p>
                    ) : (
                      <form onSubmit={handleCreateMember} className="space-y-2">
                        <input type="email" value={newMemberEmail}
                          onChange={e => setNewMemberEmail(e.target.value)}
                          placeholder="Email del nuevo miembro" required
                          className={inputClass} />
                        <input type="password" value={newMemberPassword}
                          onChange={e => setNewMemberPassword(e.target.value)}
                          placeholder="Contraseña (mínimo 8 caracteres)" minLength={8} required
                          className={inputClass} />
                        <button type="submit" disabled={creatingMember}
                          className="w-full border border-[#FF6A00] text-[#FF6A00] hover:bg-orange-50 dark:hover:bg-orange-900/20 font-semibold rounded-[8px] px-4 py-2 text-sm disabled:opacity-40 transition-colors">
                          {creatingMember ? 'Creando...' : 'Crear cuenta de miembro'}
                        </button>
                      </form>
                    )}

                    {teamError && (
                      <p className="text-xs text-[#E5484D] bg-red-50 dark:bg-red-900/20 rounded-[8px] px-3 py-2">{teamError}</p>
                    )}
                    {teamSuccess && (
                      <p className="text-xs text-[#1FB57A] bg-green-50 dark:bg-green-900/20 rounded-[8px] px-3 py-2">{teamSuccess}</p>
                    )}
                  </div>
                )
              })()}
            </section>
          )
        })()}

        {/* Preferencias */}
        <section className={sec}>
          <h2 className={secTitle}>Preferencias</h2>

          {/* Toggle modo oscuro */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9]">Modo oscuro</p>
              <p className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2]">Adapta la interfaz a tus preferencias</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              className={`relative w-11 h-6 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-[#FF6A00]' : 'bg-[#D5DCE4]'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="border-t border-[#D5DCE4] dark:border-[#3A4A5C]" />

          {/* Cerrar sesión */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full border border-[#E5484D]/50 text-[#E5484D] hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold rounded-[8px] px-4 py-3 text-sm transition-colors"
          >
            Cerrar sesión
          </button>
        </section>

      </div>
    </main>
  )
}
