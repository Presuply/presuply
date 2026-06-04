'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeProvider'

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
    } else {
      setProfile(prev => ({ ...prev, logo_url: newLogoUrl, template_url: newTemplateUrl }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  function update(field: keyof ProfileForm, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Nombre del archivo de plantilla para mostrar al usuario
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
            Sube una foto o PDF de tu presupuesto actual. Al generar el PDF, Claude imitará su estructura con los nuevos datos.
          </p>
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
