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

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !budgetId) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const file of files) {
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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-sm text-gray-400 italic">Iniciando presupuesto...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabecera */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <a
          href="/dashboard"
          className="text-gray-400 hover:text-gray-900 transition-colors text-sm"
        >
          ← Volver
        </a>
        <h1 className="text-lg font-semibold text-gray-900">Nuevo presupuesto</h1>
      </div>

      <div className="px-4 py-6 max-w-xl mx-auto space-y-6">

        {/* Zona de fotos */}
        <section className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Fotos de la obra o libreta
          </label>

          <label
            htmlFor="fotos"
            className={`flex items-center justify-center w-full rounded-xl border-2 border-dashed px-4 py-6 text-sm font-medium cursor-pointer transition-colors ${
              uploading
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            {uploading ? (
              <span className="italic text-gray-400">Subiendo foto...</span>
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
                <li key={u.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
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
          <label htmlFor="notas" className="block text-sm font-medium text-gray-700">
            Notas o texto de WhatsApp
          </label>
          <textarea
            id="notas"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el mensaje de WhatsApp o escribe las notas del trabajo..."
            rows={6}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </section>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

<button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || uploading || extracting}
          className="w-full rounded-xl bg-gray-900 px-4 py-4 text-base font-semibold text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {extracting ? 'Analizando con IA...' : 'Generar presupuesto'}
        </button>

      </div>
    </main>
  )
}
