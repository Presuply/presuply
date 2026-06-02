'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

export default function PrintPage() {
  const params = useParams()
  const id = params.id as string
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoPrinted, setAutoPrinted] = useState(false)

  useEffect(() => {
    async function generate() {
      try {
        const res = await fetch('/api/generate-pdf-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ budgetId: id }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Error al generar el documento.')
        } else {
          setHtml(data.html)
        }
      } catch {
        setError('No se pudo conectar con el servidor.')
      } finally {
        setLoading(false)
      }
    }

    generate()
  }, [id])

  function handleIframeLoad() {
    if (!autoPrinted && iframeRef.current?.contentWindow) {
      setAutoPrinted(true)
      // Pequeño delay para que el navegador termine de renderizar antes de imprimir
      setTimeout(() => iframeRef.current?.contentWindow?.print(), 300)
    }
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Barra de control — oculta al imprimir vía clase CSS */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 print:hidden space-y-2">
        <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.close()}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Cerrar
        </button>
        <span className="text-sm text-gray-400">|</span>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!html}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          Imprimir / Guardar PDF
        </button>
        {loading && (
          <span className="text-sm text-gray-400 italic">Generando documento...</span>
        )}
        </div>
        <p className="text-xs text-gray-400">
          Para eliminar encabezados de página, desactiva &quot;Encabezados y pies&quot; en las opciones de impresión.
        </p>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400 italic">Generando documento con IA...</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => window.close()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Volver al editor
              </button>
            </div>
          </div>
        )}

        {html && (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            onLoad={handleIframeLoad}
            className="flex-1 w-full border-0"
            style={{ minHeight: 'calc(100vh - 50px)' }}
            title="Vista previa del presupuesto"
          />
        )}
      </div>

    </div>
  )
}
