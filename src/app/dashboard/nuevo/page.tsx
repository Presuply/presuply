'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Tooltip from '@/components/Tooltip'
import { usePageTooltips } from '@/hooks/usePageTooltips'
import LoadingButton from '@/components/LoadingButton'

interface UploadedFile {
  id: string
  previewUrl: string
  storagePath: string
  fileName: string
  isPdf: boolean
}

const PDF_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export default function NuevoPresupuestoPage() {
  const router = useRouter()
  const [budgetId, setBudgetId] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [generatingFull, setGeneratingFull] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Evita crear dos drafts en React Strict Mode (doble ejecución de efectos en dev)
  const creatingRef = useRef(false)

  useEffect(() => {
    if (creatingRef.current) return
    creatingRef.current = true

    async function createDraft() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('budgets')
        .insert({ user_id: user.id })
        .select('id')
        .single()

      if (error || !data) {
        setError('No se pudo iniciar el presupuesto. Inténtalo de nuevo.')
        return
      }

      setBudgetId(data.id)
    }

    createDraft()
  }, [router])

  async function convertIfHeic(file: File): Promise<File> {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const isHeic = ext === 'heic' || ext === 'heif' ||
      file.type === 'image/heic' || file.type === 'image/heif'
    if (!isHeic) return file

    const { default: heic2any } = await import('heic2any')
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(converted) ? converted[0] : converted
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
    return new File([blob], newName, { type: 'image/jpeg' })
  }

  function sanitizeFileName(name: string): string {
    const dotIdx = name.lastIndexOf('.')
    const ext = dotIdx !== -1 ? name.slice(dotIdx).toLowerCase() : ''
    const base = dotIdx !== -1 ? name.slice(0, dotIdx) : name
    const safe = base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')  // eliminar diacríticos: á→a, é→e, ñ→n
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '')
    return (safe || 'archivo') + ext
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !budgetId) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const original of files) {
      const isPdf = original.type === 'application/pdf'

      // Validar tamaño — aplica a todos los archivos
      if (original.size > PDF_MAX_BYTES) {
        setError('El archivo es demasiado grande. El tamaño máximo es 10 MB.')
        continue
      }

      let file: File
      try {
        file = isPdf ? original : await convertIfHeic(original)
      } catch {
        setError(`No se pudo procesar "${original.name}". Inténtalo de nuevo.`)
        continue
      }

      const safeFileName = `${Date.now()}_${sanitizeFileName(file.name)}`
      const storagePath = `${user.id}/${budgetId}/${safeFileName}`

      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file)

      if (storageError) {
        const status = (storageError as { status?: number; statusCode?: number }).status
          ?? (storageError as { status?: number; statusCode?: number }).statusCode
        console.error('Supabase Storage upload error:', storageError.message, status)

        const isBucketError = status === 404 ||
          storageError.message.toLowerCase().includes('bucket')
        setError(isBucketError
          ? 'Error de configuración del almacenamiento. Contacta con soporte.'
          : `No se pudo subir "${original.name}". Inténtalo de nuevo.`)
        continue
      }

      const { data: uploadRow, error: dbError } = await supabase
        .from('uploads')
        .insert({
          budget_id: budgetId,
          user_id: user.id,
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
        })
        .select('id')
        .single()

      if (dbError || !uploadRow) {
        setError(`Archivo subido pero no registrado: "${file.name}".`)
        continue
      }

      setUploads((prev) => [
        ...prev,
        {
          id: uploadRow.id,
          previewUrl: isPdf ? '' : URL.createObjectURL(file),
          storagePath,
          fileName: file.name,
          isPdf,
        },
      ])
    }

    setUploading(false)
    // Permite seleccionar el mismo archivo de nuevo si fuera necesario
    e.target.value = ''
  }

  async function handleDelete(upload: UploadedFile) {
    const supabase = createClient()
    await supabase.storage.from('uploads').remove([upload.storagePath])
    await supabase.from('uploads').delete().eq('id', upload.id)
    if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl)
    setUploads((prev) => prev.filter((u) => u.id !== upload.id))
  }

  async function callExtract(): Promise<boolean> {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budgetId,
        uploadPaths: uploads.map((u) => u.storagePath),
        text: text.trim() || undefined,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      if (data.error === 'trial_exhausted' || data.error === 'monthly_limit') {
        router.push('/pricing')
        return false
      }
      setError(data.error ?? 'Error al generar el presupuesto. Inténtalo de nuevo.')
      return false
    }
    return true
  }

  async function handleGenerate() {
    if (!budgetId) return
    setExtracting(true)
    setError(null)
    try {
      const ok = await callExtract()
      if (ok) router.push(`/dashboard/presupuesto/${budgetId}`)
    } catch {
      setError('No se pudo conectar con el servidor. Inténtalo de nuevo.')
    } finally {
      setExtracting(false)
    }
  }

  async function handleGenerateFull() {
    if (!budgetId) return
    setGeneratingFull(true)
    setError(null)
    try {
      // Fase 1: extraer partidas
      const ok = await callExtract()
      if (!ok) return

      // Fase 2: expandir descripciones
      const supabase = createClient()
      const { data: rawItems } = await supabase
        .from('line_items')
        .select('id, description')
        .eq('budget_id', budgetId)

      if (rawItems && rawItems.length > 0) {
        try {
          const res = await fetch('/api/expand-descriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              budgetId,
              items: rawItems.map(i => ({ id: i.id, description: i.description })),
            }),
          })
          if (!res.ok) throw new Error('expand failed')
        } catch {
          setError('Las descripciones extendidas no se pudieron generar. Puedes generarlas desde el editor.')
        }
      }

      router.push(`/dashboard/presupuesto/${budgetId}`)
    } catch {
      setError('No se pudo conectar con el servidor. Inténtalo de nuevo.')
      setGeneratingFull(false)
    }
  }

  const canGenerate = uploads.length > 0 || text.trim().length > 0
  const busy = uploading || extracting || generatingFull
  const { activeId: tooltipId, markSeen, skipAll: skipTour } =
    usePageTooltips(['new_upload', 'new_ai'])

  if (!budgetId) {
    return (
      <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center px-4">
        <p className="text-sm text-[#A9B5C2] italic">Iniciando presupuesto...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A]">
      {/* Cabecera */}
      <div className="bg-white dark:bg-[#1B2A3A] border-b border-[#D5DCE4] dark:border-[#3A4A5C] px-4 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-[#6B7B8C] hover:text-[#FF6A00] transition-colors text-sm">
          ← Volver
        </a>
        <h1 className="text-lg font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Nuevo presupuesto</h1>
      </div>

      <div className="px-4 py-6 max-w-xl mx-auto space-y-6">

        {/* Zona de fotos y PDFs */}
        <section className="space-y-3">
          <label className="block text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9]">
            Fotos o PDFs de la obra
          </label>

          <div className="relative">
            <label
              htmlFor="fotos"
              className={`flex items-center justify-center w-full rounded-[12px] border-2 border-dashed px-4 py-6 text-sm font-semibold cursor-pointer transition-colors ${
                uploading
                  ? 'border-[#D5DCE4] dark:border-[#3A4A5C] text-[#A9B5C2] cursor-not-allowed'
                  : 'border-[#D5DCE4] dark:border-[#3A4A5C] text-[#6B7B8C] hover:border-[#FF6A00] hover:text-[#FF6A00]'
              }`}
            >
              {uploading ? (
                <span className="italic text-[#A9B5C2]">Subiendo archivo...</span>
              ) : (
                '+ Añadir fotos o PDFs'
              )}
            </label>
            <Tooltip
              content="Sube fotos, PDFs o pega texto de WhatsApp. Puedes combinar varios archivos a la vez"
              placement="bottom"
              isActive={tooltipId === 'new_upload'}
              onDismiss={() => markSeen('new_upload')}
              onSkipAll={skipTour}
            />
          </div>
          <input
            id="fotos"
            type="file"
            accept="image/*,application/pdf"
            multiple
            disabled={uploading}
            onChange={handleFiles}
            className="sr-only"
          />

          {uploads.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {uploads.map((u) => (
                <li key={u.id} className="relative aspect-square rounded-[12px] overflow-hidden bg-[#EDF0F4] dark:bg-[#3A4A5C]">
                  {u.isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-2">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="8" y1="13" x2="16" y2="13" />
                        <line x1="8" y1="17" x2="16" y2="17" />
                        <line x1="10" y1="9" x2="14" y2="9" />
                      </svg>
                      <span className="text-[9px] text-[#6B7B8C] dark:text-[#A9B5C2] text-center leading-tight line-clamp-2 break-all">
                        {u.fileName}
                      </span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={u.previewUrl} alt={u.fileName} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(u)}
                    aria-label={`Eliminar ${u.fileName}`}
                    className="absolute top-1 right-1 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 text-white text-xs hover:bg-black/80 transition-colors"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Texto / WhatsApp */}
        <section className="space-y-2">
          <label htmlFor="notas" className="block text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9]">
            Notas o texto de WhatsApp
          </label>
          <textarea
            id="notas"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el mensaje de WhatsApp o escribe las notas del trabajo..."
            rows={6}
            className="w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[12px] px-4 py-3 text-base focus:outline-none focus:border-[#FF6A00] resize-none transition-colors"
          />
        </section>

        {error && (
          <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div className="relative">
            <LoadingButton
              loading={extracting}
              onClick={handleGenerate}
              variant="secondary"
              messages={["Analizando con IA...", "Extrayendo partidas...", "Casi listo..."]}
              duration={15000}
              disabled={!canGenerate || busy}
              className="w-full border-2 border-[#FF6A00] text-[#FF6A00] hover:bg-orange-50 dark:hover:bg-orange-900/10 font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Generar presupuesto
            </LoadingButton>
            <Tooltip
              content="La IA analizará todo y extraerá las partidas automáticamente"
              placement="top"
              isActive={tooltipId === 'new_ai'}
              onDismiss={() => markSeen('new_ai')}
              onSkipAll={skipTour}
            />
          </div>

          <LoadingButton
            loading={generatingFull}
            onClick={handleGenerateFull}
            variant="primary"
            messages={["Extrayendo partidas...", "Analizando imágenes...", "Generando descripciones técnicas...", "Aplicando estilo profesional...", "Casi listo..."]}
            duration={45000}
            disabled={!canGenerate || busy}
            className="w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✨ Generar presupuesto completo
          </LoadingButton>
          <p className="text-xs text-[#A9B5C2] text-center">
            El presupuesto completo incluye descripciones técnicas profesionales — tarda ~30 segundos más
          </p>
        </div>

      </div>
    </main>
  )
}
