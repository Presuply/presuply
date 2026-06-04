'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UploadedFile {
  id: string
  previewUrl: string
  storagePath: string
  fileName: string
}

export default function NuevoPresupuestoPage() {
  const router = useRouter()
  const [budgetId, setBudgetId] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
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

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !budgetId) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const original of files) {
      let file: File
      try {
        file = await convertIfHeic(original)
      } catch {
        setError(`No se pudo procesar "${original.name}". Inténtalo de nuevo.`)
        continue
      }

      const fileName = `${Date.now()}_${file.name}`
      const storagePath = `${user.id}/${budgetId}/${fileName}`

      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file)

      if (storageError) {
        setError(`No se pudo subir "${file.name}". Inténtalo de nuevo.`)
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
        setError(`Foto subida pero no registrada: "${file.name}".`)
        continue
      }

      setUploads((prev) => [
        ...prev,
        {
          id: uploadRow.id,
          previewUrl: URL.createObjectURL(file),
          storagePath,
          fileName: file.name,
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
    URL.revokeObjectURL(upload.previewUrl)
    setUploads((prev) => prev.filter((u) => u.id !== upload.id))
  }

  async function handleGenerate() {
    if (!budgetId) return
    setExtracting(true)
    setError(null)

    try {
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
        if (data.error === 'trial_exhausted') {
          router.push('/pricing')
          return
        }
        setError(data.error ?? 'Error al generar el presupuesto. Inténtalo de nuevo.')
        setExtracting(false)
      } else {
        router.push(`/dashboard/presupuesto/${budgetId}`)
      }
    } catch {
      setError('No se pudo conectar con el servidor. Inténtalo de nuevo.')
      setExtracting(false)
    }
  }

  const canGenerate = uploads.length > 0 || text.trim().length > 0

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

        {/* Zona de fotos */}
        <section className="space-y-3">
          <label className="block text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9]">
            Fotos de la obra o libreta
          </label>

          <label
            htmlFor="fotos"
            className={`flex items-center justify-center w-full rounded-[12px] border-2 border-dashed px-4 py-6 text-sm font-semibold cursor-pointer transition-colors ${
              uploading
                ? 'border-[#D5DCE4] dark:border-[#3A4A5C] text-[#A9B5C2] cursor-not-allowed'
                : 'border-[#D5DCE4] dark:border-[#3A4A5C] text-[#6B7B8C] hover:border-[#FF6A00] hover:text-[#FF6A00]'
            }`}
          >
            {uploading ? (
              <span className="italic text-[#A9B5C2]">Subiendo foto...</span>
            ) : (
              '+ Añadir fotos'
            )}
          </label>
          <input
            id="fotos"
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={handleFiles}
            className="sr-only"
          />

          {uploads.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {uploads.map((u) => (
                <li key={u.id} className="relative aspect-square rounded-[12px] overflow-hidden bg-[#EDF0F4] dark:bg-[#3A4A5C]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u.previewUrl}
                    alt={u.fileName}
                    className="w-full h-full object-cover"
                  />
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

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || uploading || extracting}
          className="w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {extracting ? 'Analizando con IA...' : 'Generar presupuesto'}
        </button>

      </div>
    </main>
  )
}
