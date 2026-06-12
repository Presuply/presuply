import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan variables de entorno: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Uso: npm run import-bcca -- ./bcca_partidas.csv')
  process.exit(1)
}

const resolvedPath = path.resolve(csvPath)
if (!fs.existsSync(resolvedPath)) {
  console.error(`Archivo no encontrado: ${resolvedPath}`)
  process.exit(1)
}

interface CsvRow {
  codigo: string
  capitulo: string
  subcapitulo: string
  unidad: string
  descripcion: string
  descripcion_larga: string
  precio_referencia: string
  tipo: string
  fuente: string
  activo: string
}

interface PartidaRow {
  codigo: string
  capitulo: string | null
  subcapitulo: string | null
  unidad: string | null
  descripcion: string
  descripcion_larga: string | null
  precio_referencia: number | null
  tipo: string | null
  fuente: string | null
  activo: boolean
}

const BATCH_SIZE = 100

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  const content = fs.readFileSync(resolvedPath, 'utf-8')
  const { data: rows, errors } = Papa.parse<CsvRow>(content, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    console.warn(`Advertencias al parsear CSV: ${errors.length} filas con errores (se omitirán)`)
  }

  const partidas: PartidaRow[] = rows
    .filter(r => r.activo?.trim().toLowerCase() === 'true')
    .map(r => ({
      codigo: r.codigo?.trim() ?? '',
      capitulo: r.capitulo?.trim() || null,
      subcapitulo: r.subcapitulo?.trim() || null,
      unidad: r.unidad?.trim() || null,
      descripcion: r.descripcion?.trim() ?? '',
      descripcion_larga: r.descripcion_larga?.trim() || null,
      precio_referencia: r.precio_referencia ? parseFloat(r.precio_referencia) || null : null,
      tipo: r.tipo?.trim() || null,
      fuente: r.fuente?.trim() || null,
      activo: true,
    }))
    .filter(r => r.codigo && r.descripcion)

  const total = partidas.length
  console.log(`CSV parseado: ${rows.length} filas totales, ${total} activas con descripción`)

  let imported = 0
  for (let i = 0; i < partidas.length; i += BATCH_SIZE) {
    const batch = partidas.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('partidas_bcca').insert(batch)
    if (error) {
      console.error(`Error en batch ${i}–${i + batch.length - 1}:`, error.message)
      process.exit(1)
    }
    imported += batch.length
    console.log(`Importadas ${imported}/${total} partidas...`)
  }

  console.log(`✓ Importación completada: ${imported} partidas insertadas en partidas_bcca`)
}

main().catch(err => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
