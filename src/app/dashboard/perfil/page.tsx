'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

export default function PerfilPage() {
  const router = useRouter()
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

  // Nombre del archivo de plantilla para mostrar al usuario
  const templateDisplayName = templateFile?.name
    ?? (profile.template_url ? profile.template_url.split('/').pop() : null)

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400 italic">Cargando perfil...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-gray-400 hover:text-gray-900 text-sm transition-colors">
          ← Volver
        </a>
        <h1 className="text-lg font-semibold text-gray-900">Mi perfil</h1>
      </div>

      <div className="px-4 py-6 max-w-xl mx-auto space-y-6">

        {/* Logo */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Logo de empresa</h2>
          <div className="flex items-center gap-4">
            {logoDisplayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoDisplayUrl} alt="Logo"
                className="w-20 h-20 object-contain rounded-lg border border-gray-200 bg-gray-50" />
            ) : (
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                Sin logo
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="logo"
                className="inline-block rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors">
                {logoDisplayUrl ? 'Cambiar logo' : 'Subir logo'}
              </label>
              <input id="logo" type="file" accept="image/*" onChange={handleLogoChange} className="sr-only" />
              <p className="text-xs text-gray-400">PNG, JPG o SVG. Se verá en el PDF.</p>
            </div>
          </div>
        </section>

        {/* Plantilla de presupuesto */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plantilla de presupuesto</h2>
          <p className="text-xs text-gray-500">
            Sube una foto o PDF de tu presupuesto actual. Al generar el PDF, Claude imitará su estructura con los nuevos datos.
          </p>
          <div className="flex items-center gap-3">
            <label htmlFor="template"
              className="inline-block rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors shrink-0">
              {templateDisplayName ? 'Cambiar plantilla' : 'Subir plantilla'}
            </label>
            <input id="template" type="file" accept="image/*,application/pdf"
              onChange={handleTemplateChange} className="sr-only" />
            {templateDisplayName && (
              <span className="text-sm text-gray-600 truncate">{templateDisplayName}</span>
            )}
          </div>
          {!templateDisplayName && (
            <p className="text-xs text-gray-400">JPG, PNG o PDF. Si no subes plantilla, se usará una plantilla estándar.</p>
          )}
        </section>

        {/* Datos de empresa */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datos de empresa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Nombre completo</label>
              <input type="text" value={profile.full_name}
                onChange={e => update('full_name', e.target.value)}
                placeholder="Tu nombre" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Empresa</label>
              <input type="text" value={profile.company_name}
                onChange={e => update('company_name', e.target.value)}
                placeholder="Nombre de empresa o autónomo" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">NIF / CIF</label>
              <input type="text" value={profile.nif}
                onChange={e => update('nif', e.target.value)}
                placeholder="12345678A" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Teléfono</label>
              <input type="tel" value={profile.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="600 000 000" className={inputClass} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500">Dirección</label>
              <input type="text" value={profile.address}
                onChange={e => update('address', e.target.value)}
                placeholder="Calle, número, localidad, provincia" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Email (cuenta)</label>
              <input type="email" value={email} disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">IBAN</label>
              <input type="text" value={profile.iban}
                onChange={e => update('iban', e.target.value)}
                placeholder="ES00 0000 0000 00 0000000000" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Prefijo de factura</label>
              <input type="text" value={profile.invoice_prefix}
                onChange={e => update('invoice_prefix', e.target.value)}
                placeholder="Ej. 26" className={inputClass} />
            </div>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {saved && (
          <p className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Perfil guardado correctamente.
          </p>
        )}

        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full rounded-xl bg-gray-900 px-4 py-4 text-base font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors">
          {saving ? 'Guardando...' : 'Guardar perfil'}
        </button>

      </div>
    </main>
  )
}
