'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Confidence } from '@/types/database'
import Tooltip from '@/components/Tooltip'
import { usePageTooltips } from '@/hooks/usePageTooltips'
import LoadingButton from '@/components/LoadingButton'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DraggableSyntheticListeners,
  type CollisionDetection,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Interfaces ─────────────────────────────────────────────────────────────

interface EditableChapter {
  id: string
  name: string
  position: number
  _isNew: boolean
  _deleted: boolean
}

interface EditableLineItem {
  id: string
  chapter_id: string | null
  description: string
  unit: string
  quantity: number
  unit_price: number
  total: number
  confidence: Confidence | null
  position: number
  descripcion_extendida: string | null
  titulo_partida: string | null
  _isNew: boolean
  _deleted: boolean
}

interface ExtendedDescEdit {
  itemId: string
  titulo: string
  descripcion: string
  saving: boolean
  regenerating: boolean
}

interface BudgetHeader {
  client_name: string
  client_email: string
  client_address: string
  client_phone: string
  client_nif: string
  budget_number: number
  tax_type: 'IGIC' | 'IVA'
  tax_rate: number
  valid_days: number
  issued_date: string
  invoice_number: string
  overhead_enabled: boolean
  overhead_rate: number
  profit_enabled: boolean
  profit_rate: number
  extras_description: string
  extras_amount: number
  show_iban: boolean
  show_signature: boolean
  expand_descriptions: boolean
}

interface DeleteConfirm {
  chapterId: string
  chapterName: string
  itemCount: number
}

// ── Constantes ─────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const inputClass =
  'w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-[#FF6A00] transition-colors'

const inlineInput =
  'bg-transparent text-[#0D1B2A] dark:text-[#F4F6F9] px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6A00] rounded transition-colors'

// ── Fila sortable ──────────────────────────────────────────────────────────

function SortableRow({
  item,
  chIdx,
  itemIdx,
  onUpdate,
  onDelete,
  onEditExtended,
}: {
  item: EditableLineItem
  chIdx: number
  itemIdx: number
  onUpdate: (id: string, field: keyof EditableLineItem, value: string | number | null) => void
  onDelete: (id: string) => void
  onEditExtended: (itemId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={item.confidence === 'baja'
        ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-[#F5A623]'
        : 'bg-white dark:bg-[#1B2A3A]'}
      {...attributes}
    >
      <td className="px-2 py-2 w-7">
        <button
          type="button"
          {...listeners}
          aria-label="Arrastrar"
          className="cursor-grab active:cursor-grabbing touch-none text-[#A9B5C2] hover:text-[#6B7B8C] text-base leading-none select-none px-0.5"
        >
          ⠿
        </button>
      </td>
      <td className="px-2 py-2 w-10 text-xs text-[#A9B5C2] whitespace-nowrap tabular-nums select-none">
        {chIdx + 1}.{itemIdx + 1}
      </td>
      <td className="px-2 py-2">
        <input type="text" value={item.description}
          onChange={e => onUpdate(item.id, 'description', e.target.value)}
          placeholder="Descripción"
          className={`w-full min-w-[140px] ${inlineInput}`} />
      </td>
      <td className="px-2 py-2">
        <input type="text" value={item.unit}
          onChange={e => onUpdate(item.id, 'unit', e.target.value)}
          placeholder="ud"
          className={`w-12 ${inlineInput}`} />
      </td>
      <td className="px-2 py-2">
        <input type="number" value={item.quantity} min={0} step="any"
          onChange={e => onUpdate(item.id, 'quantity', Number(e.target.value))}
          className={`w-20 text-right ${inlineInput}`} />
      </td>
      <td className="px-2 py-2">
        <input type="number" value={item.unit_price} min={0} step="any"
          onChange={e => onUpdate(item.id, 'unit_price', Number(e.target.value))}
          className={`w-24 text-right ${inlineInput}`} />
      </td>
      <td className="px-2 py-2 text-right font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] whitespace-nowrap">
        {fmt(item.total)} €
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-0.5">
          {item.descripcion_extendida && (
            <button
              type="button"
              onClick={() => onEditExtended(item.id)}
              aria-label="Editar descripción extendida"
              className="flex items-center justify-center w-6 h-6 rounded-full text-[#FF6A00] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-xs"
            >
              ✎
            </button>
          )}
          <button type="button" onClick={() => onDelete(item.id)} aria-label="Eliminar partida"
            className="flex items-center justify-center w-6 h-6 rounded-full text-[#A9B5C2] hover:text-[#E5484D] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Sección de capítulo ────────────────────────────────────────────────────

function ChapterSection({
  chapter,
  chIdx,
  items,
  chSubtotal,
  isOnlyChapter,
  isOpen,
  onToggleOpen,
  openMenuId,
  setOpenMenuId,
  onRename,
  onDelete,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onEditExtended,
  dragListeners,
}: {
  chapter: EditableChapter
  chIdx: number
  items: EditableLineItem[]
  chSubtotal: number
  isOnlyChapter: boolean
  isOpen: boolean
  onToggleOpen: () => void
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onAddItem: (chapterId: string) => void
  onUpdateItem: (id: string, field: keyof EditableLineItem, value: string | number | null) => void
  onDeleteItem: (id: string) => void
  onEditExtended: (itemId: string) => void
  dragListeners?: DraggableSyntheticListeners
}) {
  const { setNodeRef: setDropRef } = useDroppable({ id: `droppable_${chapter.id}` })
  const nameRef = useRef<HTMLInputElement>(null)

  return (
    <section
      ref={setDropRef}
      className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm overflow-hidden"
    >
      {/* Cabecera */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#F4F6F9] dark:bg-[#0D1B2A] border-b border-[#D5DCE4] dark:border-[#3A4A5C]">
        <button
          type="button"
          {...dragListeners}
          aria-label="Arrastrar capítulo"
          className="cursor-grab active:cursor-grabbing touch-none text-[#A9B5C2] hover:text-[#6B7B8C] text-base leading-none select-none px-0.5 shrink-0"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggleOpen() }}
          aria-label={isOpen ? 'Contraer capítulo' : 'Expandir capítulo'}
          className="touch-none text-[#A9B5C2] hover:text-[#FF6A00] text-base leading-none select-none px-0.5 shrink-0"
        >
          {isOpen ? '←' : '→'}
        </button>
        <span className="text-xs font-bold text-[#A9B5C2] shrink-0">{chIdx + 1}.</span>
        <input
          ref={nameRef}
          type="text"
          value={chapter.name}
          onChange={e => onRename(chapter.id, e.target.value)}
          className="flex-1 bg-transparent font-semibold text-sm text-[#0D1B2A] dark:text-[#F4F6F9] focus:outline-none focus:ring-1 focus:ring-[#FF6A00] rounded px-1 min-w-0"
        />
        <span className="text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] whitespace-nowrap shrink-0">
          {fmt(chSubtotal)} €
        </span>
        {/* Menú ⋮ */}
        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setOpenMenuId(openMenuId === chapter.id ? null : chapter.id)}
            className="w-7 h-7 flex items-center justify-center text-[#A9B5C2] hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9] hover:bg-[#D5DCE4] dark:hover:bg-[#3A4A5C] rounded transition-colors text-lg"
            aria-label="Opciones del capítulo"
          >
            ⋮
          </button>
          {openMenuId === chapter.id && (
            <div className="absolute right-0 top-8 bg-white dark:bg-[#1B2A3A] border border-[#D5DCE4] dark:border-[#3A4A5C] rounded-[8px] shadow-lg z-20 min-w-[160px]">
              <button
                type="button"
                onClick={() => { setOpenMenuId(null); nameRef.current?.focus(); nameRef.current?.select() }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#0D1B2A] dark:text-[#F4F6F9] hover:bg-[#F4F6F9] dark:hover:bg-[#0D1B2A] transition-colors rounded-t-[8px]"
              >
                Renombrar
              </button>
              {!isOnlyChapter && (
                <button
                  type="button"
                  onClick={() => onDelete(chapter.id)}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#E5484D] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-[8px]"
                >
                  Eliminar capítulo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      {isOpen && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D5DCE4] dark:border-[#3A4A5C] bg-[#F4F6F9] dark:bg-[#0D1B2A] text-left">
                  <th className="px-2 py-2 w-7" />
                  <th className="px-2 py-2 w-10 text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2]">Nº</th>
                  <th className="px-2 py-2 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2]">Descripción</th>
                  <th className="px-2 py-2 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] whitespace-nowrap">Ud.</th>
                  <th className="px-2 py-2 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] text-right whitespace-nowrap">Cantidad</th>
                  <th className="px-2 py-2 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] text-right whitespace-nowrap">P. Unit.</th>
                  <th className="px-2 py-2 font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] text-right whitespace-nowrap">Total</th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5DCE4] dark:divide-[#3A4A5C]">
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {items.map((item, itemIdx) => (
                    <SortableRow key={item.id} item={item} chIdx={chIdx} itemIdx={itemIdx} onUpdate={onUpdateItem} onDelete={onDeleteItem} onEditExtended={onEditExtended} />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#D5DCE4] dark:border-[#3A4A5C]">
            <button type="button" onClick={() => onAddItem(chapter.id)}
              className="text-sm font-semibold text-[#FF6A00] hover:text-[#FF9248] transition-colors">
              + Añadir partida
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function SortableChapterSection(props: {
  chapter: EditableChapter
  chIdx: number
  items: EditableLineItem[]
  chSubtotal: number
  isOnlyChapter: boolean
  isOpen: boolean
  onToggleOpen: () => void
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onAddItem: (chapterId: string) => void
  onUpdateItem: (id: string, field: keyof EditableLineItem, value: string | number | null) => void
  onDeleteItem: (id: string) => void
  onEditExtended: (itemId: string) => void
}) {
  const { chapter } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `chapter:${chapter.id}` })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
    >
      <ChapterSection {...props} dragListeners={listeners} />
    </div>
  )
}

// ── Helpers de reordenamiento ──────────────────────────────────────────────

function renumberPositions(items: EditableLineItem[]): EditableLineItem[] {
  const counter = new Map<string | null, number>()
  return items.map(item => {
    if (item._deleted) return item
    const pos = counter.get(item.chapter_id) ?? 0
    counter.set(item.chapter_id, pos + 1)
    return { ...item, position: pos }
  })
}

// ── Página principal ───────────────────────────────────────────────────────

export default function PresupuestoEditorPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { activeId: tooltipId, markSeen, skipAll: skipTour } =
    usePageTooltips(['edit_autosave', 'edit_chapters', 'edit_export'])
  const [dirty, setDirty] = useState(false)
  const [lastChange, setLastChange] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingBudget, setGeneratingBudget] = useState(false)
  const [generatingBC3, setGeneratingBC3] = useState(false)
  const [loadingCsv, setLoadingCsv] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [extendedEdit, setExtendedEdit] = useState<ExtendedDescEdit | null>(null)
  const [chapters, setChapters] = useState<EditableChapter[]>([])
  const [lineItems, setLineItems] = useState<EditableLineItem[]>([])
  const [profileIban, setProfileIban] = useState<string | null>(null)
  const [profileTemplateUrl, setProfileTemplateUrl] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [budgetSectionOpen, setBudgetSectionOpen] = useState(true)
  const [clientSectionOpen, setClientSectionOpen] = useState(true)
  const [collapsedChapterIds, setCollapsedChapterIds] = useState<Set<string>>(() => new Set())

  const [budget, setBudget] = useState<BudgetHeader>({
    client_name: '', client_email: '', client_address: '', client_phone: '', client_nif: '',
    budget_number: 0, tax_type: 'IGIC', tax_rate: 7, valid_days: 30,
    issued_date: new Date().toISOString().slice(0, 10), invoice_number: '',
    overhead_enabled: false, overhead_rate: 13, profit_enabled: false, profit_rate: 6,
    extras_description: '', extras_amount: 0, show_iban: false, show_signature: false, expand_descriptions: true,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const collisionDetectionStrategy: CollisionDetection = args => {
    const activeIdStr = String(args.active.id)

    if (activeIdStr.startsWith('chapter:')) {
      return closestCenter(args).filter(c => {
        const id = String(c.id)
        return id.startsWith('chapter:') || id.startsWith('droppable_')
      })
    }

    const pointerCollisions = pointerWithin(args)
    const pointerItemCollisions = pointerCollisions.filter(c => {
      const id = String(c.id)
      return !id.startsWith('droppable_') && !id.startsWith('chapter:')
    })
    if (pointerItemCollisions.length > 0) return pointerItemCollisions

    const pointerNonChapter = pointerCollisions.filter(c => !String(c.id).startsWith('chapter:'))
    if (pointerNonChapter.length > 0) return pointerNonChapter

    const rectCollisions = rectIntersection(args)
    const rectItemCollisions = rectCollisions.filter(c => {
      const id = String(c.id)
      return !id.startsWith('droppable_') && !id.startsWith('chapter:')
    })
    if (rectItemCollisions.length > 0) return rectItemCollisions

    const rectNonChapter = rectCollisions.filter(c => !String(c.id).startsWith('chapter:'))
    if (rectNonChapter.length > 0) return rectNonChapter

    return closestCenter(args)
  }

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const [{ data: b }, { data: profile }] = await Promise.all([
        supabase.from('budgets').select('*').eq('id', id).single(),
        supabase.from('profiles').select('iban, template_url').eq('id', user.id).single(),
      ])
      if (!b) { setLoading(false); return }
      if (b.pdf_url) setPdfUrl(b.pdf_url)
      setProfileIban(profile?.iban ?? null)
      setProfileTemplateUrl(profile?.template_url ?? null)

      setBudget({
        client_name: b.client_name ?? '', client_email: b.client_email ?? '',
        client_address: b.client_address ?? '', client_phone: b.client_phone ?? '',
        client_nif: b.client_nif ?? '', budget_number: b.budget_number,
        tax_type: (b.tax_type === 'IVA' ? 'IVA' : 'IGIC') as 'IGIC' | 'IVA',
        tax_rate: Number(b.tax_rate), valid_days: b.valid_days ?? 30,
        issued_date: b.issued_date ?? new Date().toISOString().slice(0, 10),
        invoice_number: b.invoice_number ?? '',
        overhead_enabled: b.overhead_enabled ?? false,
        overhead_rate: Number(b.overhead_rate) || 13,
        profit_enabled: b.profit_enabled ?? false,
        profit_rate: Number(b.profit_rate) || 6,
        extras_description: b.extras_description ?? '',
        extras_amount: Number(b.extras_amount) || 0,
        show_iban: b.show_iban ?? false,
        show_signature: b.show_signature ?? false,
        expand_descriptions: b.expand_descriptions ?? true,
      })

      const [{ data: rawChapters }, { data: rawItems, error: itemsError }] = await Promise.all([
        supabase.from('chapters').select('*').eq('budget_id', id).order('position'),
        supabase.from('line_items').select('id, chapter_id, description, unit, quantity, unit_price, total, confidence, position, descripcion_extendida, titulo_partida, created_at').eq('budget_id', id).order('position'),
      ])
      if (itemsError) console.error('Error cargando line_items:', itemsError)

      const existingChapters = rawChapters ?? []
      const existingItems = rawItems ?? []

      // Migración: presupuestos anteriores a capítulos
      if (existingChapters.length === 0 && existingItems.length > 0) {
        const { data: newChapter } = await supabase
          .from('chapters')
          .insert({ budget_id: id, user_id: user.id, name: 'General', position: 0 })
          .select('id, name, position')
          .single()

        if (newChapter) {
          await supabase.from('line_items').update({ chapter_id: newChapter.id }).eq('budget_id', id)
          setChapters([{ id: newChapter.id, name: newChapter.name, position: newChapter.position, _isNew: false, _deleted: false }])
          setLineItems(existingItems.map(item => ({
            id: item.id, chapter_id: newChapter.id, description: item.description,
            unit: item.unit ?? '', quantity: Number(item.quantity),
            unit_price: Number(item.unit_price), total: Number(item.total),
            confidence: item.confidence, position: item.position,
            descripcion_extendida: item.descripcion_extendida ?? null,
            titulo_partida: item.titulo_partida ?? null,
            _isNew: false, _deleted: false,
          })))
        }
      } else {
        setChapters(existingChapters.map(c => ({
          id: c.id, name: c.name, position: c.position, _isNew: false, _deleted: false,
        })))
        setLineItems(existingItems.map(item => ({
          id: item.id, chapter_id: item.chapter_id ?? null, description: item.description,
          unit: item.unit ?? '', quantity: Number(item.quantity),
          unit_price: Number(item.unit_price), total: Number(item.total),
          confidence: item.confidence, position: item.position,
          descripcion_extendida: item.descripcion_extendida ?? null,
          titulo_partida: item.titulo_partida ?? null,
          _isNew: false, _deleted: false,
        })))
      }

      setLoading(false)
    }
    load()
  }, [id, router])

  // ── Totales ──────────────────────────────────────────────────────────────
  const visibleItems = lineItems.filter(i => !i._deleted)
  const subtotal = visibleItems.reduce((sum, i) => sum + i.total, 0)
  const overhead = budget.overhead_enabled ? subtotal * (budget.overhead_rate / 100) : 0
  const profit = budget.profit_enabled ? (subtotal + overhead) * (budget.profit_rate / 100) : 0
  const extras = budget.extras_amount || 0
  const baseImponible = subtotal + overhead + profit + extras
  const taxAmount = baseImponible * (budget.tax_rate / 100)
  const totalAmount = baseImponible + taxAmount

  // ── Helpers ──────────────────────────────────────────────────────────────
  function markDirty() { setDirty(true); setLastChange(Date.now()) }

  function updateBudgetField<K extends keyof BudgetHeader>(key: K, value: BudgetHeader[K]) {
    setBudget(prev => ({ ...prev, [key]: value })); markDirty()
  }

  function handleTaxTypeChange(taxType: 'IGIC' | 'IVA') {
    setBudget(prev => ({ ...prev, tax_type: taxType, tax_rate: taxType === 'IGIC' ? 7 : 21 })); markDirty()
  }

  // ── Partidas ─────────────────────────────────────────────────────────────
  function updateItem(itemId: string, field: keyof EditableLineItem, value: string | number | null) {
    setLineItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    }))
    markDirty()
  }

  function addItem(chapterId: string) {
    const chapterItems = visibleItems.filter(i => i.chapter_id === chapterId)
    const maxPos = chapterItems.length > 0 ? Math.max(...chapterItems.map(i => i.position)) : -1
    setLineItems(prev => [...prev, {
      id: `new-${Date.now()}`, chapter_id: chapterId, description: '', unit: '',
      quantity: 1, unit_price: 0, total: 0, confidence: null,
      descripcion_extendida: null, titulo_partida: null,
      position: maxPos + 1, _isNew: true, _deleted: false,
    }])
    markDirty()
  }

  function deleteItem(itemId: string) {
    setLineItems(prev => prev.map(i => i.id === itemId ? { ...i, _deleted: true } : i))
    markDirty()
  }

  // ── Capítulos ────────────────────────────────────────────────────────────
  function addChapter() {
    const visible = chapters.filter(c => !c._deleted)
    const maxPos = visible.length > 0 ? Math.max(...visible.map(c => c.position)) : -1
    setChapters(prev => [...prev, {
      id: `new-${Date.now()}`, name: `Capítulo ${visible.length + 1}`,
      position: maxPos + 1, _isNew: true, _deleted: false,
    }])
    markDirty()
  }

  function renameChapter(chapterId: string, name: string) {
    setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, name } : c))
    markDirty()
  }

  function requestDeleteChapter(chapterId: string) {
    const visible = chapters.filter(c => !c._deleted)
    if (visible.length <= 1) return
    const chapter = chapters.find(c => c.id === chapterId)!
    const itemCount = visibleItems.filter(i => i.chapter_id === chapterId).length
    setDeleteConfirm({ chapterId, chapterName: chapter.name, itemCount })
    setOpenMenuId(null)
  }

  function confirmDeleteChapter(moveItems: boolean) {
    if (!deleteConfirm) return
    const { chapterId } = deleteConfirm
    const current = chapters.find(c => c.id === chapterId)!
    const others = chapters.filter(c => !c._deleted && c.id !== chapterId)
      .sort((a, b) => a.position - b.position)
    const target = others.filter(c => c.position < current.position).pop() ?? others[0]

    if (moveItems && target) {
      setLineItems(prev => prev.map(i =>
        i.chapter_id === chapterId ? { ...i, chapter_id: target.id } : i
      ))
    } else {
      setLineItems(prev => prev.map(i =>
        i.chapter_id === chapterId ? { ...i, _deleted: true } : i
      ))
    }
    setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, _deleted: true } : c))
    setDeleteConfirm(null)
    markDirty()
  }

  // ── Drag and drop ────────────────────────────────────────────────────────
  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over || active.id === over.id) return

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    if (activeIdStr.startsWith('chapter:')) {
      const activeChapterId = activeIdStr.replace('chapter:', '')

      const getTargetChapterId = (oid: string) => {
        if (oid.startsWith('chapter:')) return oid.replace('chapter:', '')
        if (oid.startsWith('droppable_')) return oid.replace('droppable_', '')
        const overItem = lineItems.find(i => i.id === oid && !i._deleted)
        return overItem?.chapter_id ?? null
      }

      const targetChapterId = getTargetChapterId(overIdStr)
      if (!targetChapterId || targetChapterId === activeChapterId) return
      if (!chapters.find(c => c.id === activeChapterId && !c._deleted)) return
      if (!chapters.find(c => c.id === targetChapterId && !c._deleted)) return

      setChapters(prev => {
        const visible = prev.filter(c => !c._deleted).sort((a, b) => a.position - b.position)
        const oldIdx = visible.findIndex(c => c.id === activeChapterId)
        const newIdx = visible.findIndex(c => c.id === targetChapterId)
        if (oldIdx === -1 || newIdx === -1) return prev
        const reordered = arrayMove(visible, oldIdx, newIdx).map((c, idx) => ({ ...c, position: idx }))
        return prev.map(c => {
          if (c._deleted) return c
          return reordered.find(r => r.id === c.id) ?? c
        })
      })
      markDirty()
      return
    }

    const activeItem = lineItems.find(i => i.id === active.id)
    if (!activeItem || activeItem._deleted) return

    const overId = overIdStr

    if (overId.startsWith('droppable_')) {
      const targetChapterId = overId.replace('droppable_', '')
      if (!chapters.find(c => c.id === targetChapterId && !c._deleted)) return
      setLineItems(prev => {
        const withoutActive = prev.filter(i => i.id !== active.id)
        const updated = { ...activeItem, chapter_id: targetChapterId }
        let lastIdx = -1
        for (let i = withoutActive.length - 1; i >= 0; i--) {
          if (withoutActive[i].chapter_id === targetChapterId && !withoutActive[i]._deleted) {
            lastIdx = i; break
          }
        }
        const insertIdx = lastIdx === -1 ? withoutActive.length : lastIdx + 1
        return renumberPositions([
          ...withoutActive.slice(0, insertIdx), updated, ...withoutActive.slice(insertIdx),
        ])
      })
      markDirty()
      return
    }

    if (overId.startsWith('chapter:')) {
      const targetChapterId = overId.replace('chapter:', '')
      if (!chapters.find(c => c.id === targetChapterId && !c._deleted)) return
      setLineItems(prev => {
        const withoutActive = prev.filter(i => i.id !== active.id)
        const updated = { ...activeItem, chapter_id: targetChapterId }
        let lastIdx = -1
        for (let i = withoutActive.length - 1; i >= 0; i--) {
          if (withoutActive[i].chapter_id === targetChapterId && !withoutActive[i]._deleted) {
            lastIdx = i; break
          }
        }
        const insertIdx = lastIdx === -1 ? withoutActive.length : lastIdx + 1
        return renumberPositions([
          ...withoutActive.slice(0, insertIdx), updated, ...withoutActive.slice(insertIdx),
        ])
      })
      markDirty()
      return
    }

    const overItem = lineItems.find(i => i.id === overId)
    if (!overItem || overItem._deleted) return

    if (activeItem.chapter_id === overItem.chapter_id) {
      // Reordenar dentro del mismo capítulo
      setLineItems(prev => {
        const chVisible = prev
          .filter(i => i.chapter_id === activeItem.chapter_id && !i._deleted)
          .sort((a, b) => a.position - b.position)
        const oldIdx = chVisible.findIndex(i => i.id === active.id)
        const newIdx = chVisible.findIndex(i => i.id === overId)
        if (oldIdx === -1 || newIdx === -1) return prev
        const reordered = arrayMove(chVisible, oldIdx, newIdx).map((item, idx) => ({ ...item, position: idx }))
        return prev.map(item => {
          if (item.chapter_id !== activeItem.chapter_id || item._deleted) return item
          return reordered.find(r => r.id === item.id) ?? item
        })
      })
    } else {
      // Mover a otro capítulo, insertar antes del item objetivo
      setLineItems(prev => {
        const withoutActive = prev.filter(i => i.id !== active.id)
        const updated = { ...activeItem, chapter_id: overItem.chapter_id }
        const insertIdx = withoutActive.findIndex(i => i.id === overId)
        if (insertIdx === -1) return prev
        return renumberPositions([
          ...withoutActive.slice(0, insertIdx), updated, ...withoutActive.slice(insertIdx),
        ])
      })
    }
    markDirty()
  }

  // ── Guardado ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()

    const { error: budgetErr } = await supabase
      .from('budgets')
      .update({
        client_name: budget.client_name || null, client_email: budget.client_email || null,
        client_address: budget.client_address || null, client_phone: budget.client_phone || null,
        client_nif: budget.client_nif || null, tax_type: budget.tax_type, tax_rate: budget.tax_rate,
        valid_days: budget.valid_days, issued_date: budget.issued_date,
        invoice_number: budget.invoice_number || null,
        overhead_enabled: budget.overhead_enabled, overhead_rate: budget.overhead_rate,
        profit_enabled: budget.profit_enabled, profit_rate: budget.profit_rate,
        extras_description: budget.extras_description || null, extras_amount: budget.extras_amount,
        show_iban: budget.show_iban, show_signature: budget.show_signature,
        expand_descriptions: budget.expand_descriptions,
        subtotal, tax_amount: taxAmount, total: totalAmount,
      })
      .eq('id', id)

    if (budgetErr) { setSaveError('Error al guardar. Inténtalo de nuevo.'); setSaving(false); return }

    // Eliminar capítulos borrados
    for (const ch of chapters.filter(c => c._deleted && !c._isNew)) {
      await supabase.from('chapters').delete().eq('id', ch.id)
    }

    // Insertar capítulos nuevos — construir mapa temp→real
    const tempChapterMap = new Map<string, string>()
    for (const ch of chapters.filter(c => c._isNew && !c._deleted)) {
      const { data } = await supabase
        .from('chapters')
        .insert({ budget_id: id, user_id: userId, name: ch.name, position: ch.position })
        .select('id').single()
      if (data) tempChapterMap.set(ch.id, data.id)
    }

    // Actualizar capítulos existentes
    for (const ch of chapters.filter(c => !c._isNew && !c._deleted)) {
      await supabase.from('chapters').update({ name: ch.name, position: ch.position }).eq('id', ch.id)
    }

    const resolveChapterId = (cid: string | null) => cid ? (tempChapterMap.get(cid) ?? cid) : null

    // Eliminar partidas borradas
    for (const item of lineItems.filter(i => i._deleted && !i._isNew)) {
      await supabase.from('line_items').delete().eq('id', item.id)
    }

    // Insertar partidas nuevas
    const tempItemMap = new Map<string, string>()
    for (const item of lineItems.filter(i => i._isNew && !i._deleted)) {
      const { data } = await supabase
        .from('line_items')
        .insert({
          budget_id: id, user_id: userId, chapter_id: resolveChapterId(item.chapter_id),
          description: item.description, unit: item.unit || null,
          quantity: item.quantity, unit_price: item.unit_price, total: item.total,
          confidence: item.confidence, position: item.position,
        })
        .select('id').single()
      if (data) tempItemMap.set(item.id, data.id)
    }

    // Actualizar partidas existentes
    for (const item of lineItems.filter(i => !i._isNew && !i._deleted)) {
      await supabase.from('line_items').update({
        chapter_id: resolveChapterId(item.chapter_id),
        description: item.description, unit: item.unit || null,
        quantity: item.quantity, unit_price: item.unit_price, total: item.total,
        position: item.position,
      }).eq('id', item.id)
    }

    // Actualizar estado local con IDs reales
    setChapters(prev => prev
      .filter(c => !c._deleted)
      .map(c => ({ ...c, id: tempChapterMap.get(c.id) ?? c.id, _isNew: false }))
    )
    setCollapsedChapterIds(prev => {
      const next = new Set<string>()
      for (const cid of prev) next.add(tempChapterMap.get(cid) ?? cid)
      return next
    })
    setLineItems(prev => prev
      .filter(i => !i._deleted)
      .map(i => ({
        ...i,
        id: tempItemMap.get(i.id) ?? i.id,
        chapter_id: resolveChapterId(i.chapter_id),
        _isNew: false,
      }))
    )

    setDirty(false)
    setSaving(false)
  }

  const handleSaveRef = useRef(handleSave)
  useEffect(() => { handleSaveRef.current = handleSave })
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => handleSaveRef.current(), 30000)
    return () => clearTimeout(timer)
  }, [lastChange, dirty])

  // ── PDF ───────────────────────────────────────────────────────────────────

  async function uploadAndDownloadPDF(blob: Blob) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Sin sesión')
    const storagePath = `${user.id}/${id}.pdf`
    await supabase.storage.from('pdfs').upload(storagePath, blob, { upsert: true, contentType: 'application/pdf' })
    await supabase.from('budgets').update({ pdf_url: storagePath }).eq('id', id)
    setPdfUrl(storagePath)
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl; a.download = `presupuesto-${budget.budget_number}.pdf`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  }

  async function handleGeneratePDF() {
    setGeneratingPdf(true); setSaveError(null)
    try {
      if (profileTemplateUrl) {
        // Path con plantilla personalizada: genera HTML → html2canvas → jsPDF
        const res = await fetch('/api/generate-pdf-html', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ budgetId: id }),
        })
        if (!res.ok) throw new Error('Error al generar el HTML')
        const { html } = await res.json()

        const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? []
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        const bodyContent = bodyMatch ? bodyMatch[1] : html

        const container = document.createElement('div')
        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,sans-serif;'
        container.innerHTML = styleBlocks.join('\n') + bodyContent
        document.body.appendChild(container)

        const { default: html2canvas } = await import('html2canvas')
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 794 })
        document.body.removeChild(container)

        const { jsPDF } = await import('jspdf')
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfPageHeight = pdf.internal.pageSize.getHeight()
        const imgWidth = pdfWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
        let heightLeft = imgHeight - pdfPageHeight; let page = 1
        while (heightLeft > 0) {
          pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, -(pdfPageHeight * page), imgWidth, imgHeight)
          heightLeft -= pdfPageHeight; page++
        }
        await uploadAndDownloadPDF(pdf.output('blob'))

      } else {
        // Path react-pdf: el servidor devuelve el PDF directamente como binario
        const res = await fetch(`/api/generate-pdf?budgetId=${id}`)
        if (!res.ok) throw new Error('Error al generar el PDF')
        const blob = await res.blob()
        await uploadAndDownloadPDF(blob)
      }
    } catch (err) {
      console.error('Error generando PDF:', err)
      setSaveError('No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ── Exportación CSV ────────────────────────────────────────────────────
  async function handleExportCSV() {
    setLoadingCsv(true)
    await Promise.resolve()
    try {
    const fmtNum = (n: number) =>
      n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const escape = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`

    const rows: string[] = []

    // Cabecera del presupuesto
    rows.push(escape(`Presupuesto #${budget.budget_number} - ${budget.client_name || 'Sin cliente'} - ${budget.issued_date}`))
    rows.push('')

    // Cabecera de columnas
    rows.push(['Capítulo', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario', 'Total'].map(escape).join(';'))

    // Partidas por capítulo
    const sortedChapters = visibleChapters
    for (const ch of sortedChapters) {
      const chItems = visibleItems
        .filter(i => i.chapter_id === ch.id)
        .sort((a, b) => a.position - b.position)
      for (const item of chItems) {
        rows.push([
          ch.name,
          item.description,
          item.unit || '',
          fmtNum(item.quantity),
          fmtNum(item.unit_price),
          fmtNum(item.total),
        ].map(escape).join(';'))
      }
    }
    // Huérfanos
    const orphans = visibleItems.filter(i => !i.chapter_id || !visibleChapters.find(c => c.id === i.chapter_id))
    for (const item of orphans) {
      rows.push(['', item.description, item.unit || '', fmtNum(item.quantity), fmtNum(item.unit_price), fmtNum(item.total)].map(escape).join(';'))
    }

    rows.push('')

    // Resumen
    const summaryLines: [string, number][] = [
      ['Subtotal', subtotal],
      ...(budget.overhead_enabled ? [[`Gastos generales ${budget.overhead_rate}%`, overhead] as [string, number]] : []),
      ...(budget.profit_enabled ? [[`Beneficio industrial ${budget.profit_rate}%`, profit] as [string, number]] : []),
      ...(extras > 0 ? [[budget.extras_description || 'Extras', extras] as [string, number]] : []),
      ['Base imponible', baseImponible],
      [`${budget.tax_type} ${budget.tax_rate}%`, taxAmount],
      ['TOTAL', totalAmount],
    ]
    for (const [label, amount] of summaryLines) {
      rows.push([escape(''), escape(label), '', '', '', escape(fmtNum(amount))].join(';'))
    }

    const csv = '﻿' + rows.join('\n') // BOM para Excel español
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presupuesto-${budget.budget_number}-${(budget.client_name || 'cliente').replace(/\s+/g, '-')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    } finally {
      setLoadingCsv(false)
    }
  }

  // ── Exportación Excel ──────────────────────────────────────────────────
  async function handleExportExcel() {
    setLoadingExcel(true)
    try {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Presupuesto')

    ws.columns = [
      { width: 28 }, { width: 45 }, { width: 8 },
      { width: 12 }, { width: 16 }, { width: 14 },
    ]

    const chapterFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8E8E8' } }
    const numFmt = '#,##0.00'

    // Fila título
    const titleRow = ws.addRow([`Presupuesto #${budget.budget_number} - ${budget.client_name || 'Sin cliente'} - ${budget.issued_date}`])
    titleRow.font = { bold: true, size: 12 }
    ws.mergeCells(`A${titleRow.number}:F${titleRow.number}`)
    ws.addRow([])

    // Cabecera de columnas
    const headerRow = ws.addRow(['Capítulo', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario', 'Total'])
    headerRow.font = { bold: true }
    headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } }; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } } })

    // Partidas por capítulo
    for (const ch of visibleChapters) {
      const chItems = visibleItems
        .filter(i => i.chapter_id === ch.id)
        .sort((a, b) => a.position - b.position)
      if (chItems.length === 0) continue
      const chRow = ws.addRow([ch.name, '', '', '', '', chItems.reduce((s, i) => s + i.total, 0)])
      chRow.font = { bold: true }
      chRow.eachCell(cell => { cell.fill = chapterFill })
      chRow.getCell(6).numFmt = numFmt

      for (const item of chItems) {
        const r = ws.addRow(['', item.description, item.unit || '', item.quantity, item.unit_price, item.total])
        r.getCell(4).numFmt = numFmt; r.getCell(5).numFmt = numFmt; r.getCell(6).numFmt = numFmt
      }
    }
    const orphans = visibleItems.filter(i => !i.chapter_id || !visibleChapters.find(c => c.id === i.chapter_id))
    for (const item of orphans) {
      const r = ws.addRow(['', item.description, item.unit || '', item.quantity, item.unit_price, item.total])
      r.getCell(4).numFmt = numFmt; r.getCell(5).numFmt = numFmt; r.getCell(6).numFmt = numFmt
    }

    ws.addRow([])

    // Resumen
    const summaryLines: [string, number, boolean][] = [
      ['Subtotal', subtotal, false],
      ...(budget.overhead_enabled ? [[`Gastos generales ${budget.overhead_rate}%`, overhead, false] as [string, number, boolean]] : []),
      ...(budget.profit_enabled ? [[`Beneficio industrial ${budget.profit_rate}%`, profit, false] as [string, number, boolean]] : []),
      ...(extras > 0 ? [[budget.extras_description || 'Extras', extras, false] as [string, number, boolean]] : []),
      ['Base imponible', baseImponible, false],
      [`${budget.tax_type} ${budget.tax_rate}%`, taxAmount, false],
      ['TOTAL', totalAmount, true],
    ]
    for (const [label, amount, isBold] of summaryLines) {
      const r = ws.addRow(['', label, '', '', '', amount])
      r.getCell(6).numFmt = numFmt
      if (isBold) { r.font = { bold: true }; r.getCell(6).font = { bold: true } }
    }

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presupuesto-${budget.budget_number}-${(budget.client_name || 'cliente').replace(/\s+/g, '-')}.xlsx`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    } finally {
      setLoadingExcel(false)
    }
  }

  async function handleDownloadPDF() {
    if (!pdfUrl) return
    const supabase = createClient()
    const { data } = await supabase.storage.from('pdfs').createSignedUrl(pdfUrl, 60)
    if (!data?.signedUrl) return
    const response = await fetch(data.signedUrl)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl; a.download = `presupuesto-${budget.budget_number}.pdf`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  }

  // ── Exportar BC3 ─────────────────────────────────────────────────────────
  async function handleExportBC3() {
    setGeneratingBC3(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/export-bc3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetId: id }),
      })
      if (!res.ok) throw new Error('Error al generar el BC3')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `presupuesto-${budget.budget_number}.bc3`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exportando BC3:', err)
      setSaveError('No se pudo generar el archivo BC3. Inténtalo de nuevo.')
    } finally {
      setGeneratingBC3(false)
    }
  }

  // ── Generar presupuesto (expandir descripciones) ──────────────────────────
  async function handleGenerateBudget() {
    setGeneratingBudget(true)
    setSaveError(null)
    try {
      const items = visibleItems.map(i => ({ id: i.id, description: i.description }))
      const res = await fetch('/api/expand-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetId: id, items }),
      })
      if (!res.ok) throw new Error('Error al generar el presupuesto')
      const { items: expanded } = await res.json() as {
        items: Array<{ id: string; titulo_partida: string; descripcion_extendida: string }>
      }
      setLineItems(prev => prev.map(item => {
        const exp = expanded.find(e => e.id === item.id)
        if (!exp) return item
        return { ...item, titulo_partida: exp.titulo_partida || null, descripcion_extendida: exp.descripcion_extendida || null }
      }))
    } catch (err) {
      console.error('Error generando presupuesto:', err)
      setSaveError('No se pudo generar el presupuesto. Inténtalo de nuevo.')
    } finally {
      setGeneratingBudget(false)
    }
  }

  // ── Edición de descripción extendida ──────────────────────────────────────
  function openExtendedEdit(itemId: string) {
    const item = lineItems.find(i => i.id === itemId)
    if (!item) return
    setExtendedEdit({
      itemId,
      titulo: item.titulo_partida ?? '',
      descripcion: item.descripcion_extendida ?? '',
      saving: false,
      regenerating: false,
    })
  }

  async function handleSaveExtended() {
    if (!extendedEdit) return
    setExtendedEdit(prev => prev ? { ...prev, saving: true } : null)
    const supabase = createClient()
    await supabase.from('line_items').update({
      titulo_partida: extendedEdit.titulo || null,
      descripcion_extendida: extendedEdit.descripcion || null,
    }).eq('id', extendedEdit.itemId)
    setLineItems(prev => prev.map(item =>
      item.id === extendedEdit.itemId
        ? { ...item, titulo_partida: extendedEdit.titulo || null, descripcion_extendida: extendedEdit.descripcion || null }
        : item
    ))
    setExtendedEdit(null)
  }

  async function handleRegenerateExtended() {
    if (!extendedEdit) return
    const item = lineItems.find(i => i.id === extendedEdit.itemId)
    if (!item) return
    setExtendedEdit(prev => prev ? { ...prev, regenerating: true } : null)
    try {
      const res = await fetch('/api/expand-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetId: id, items: [{ id: item.id, description: item.description }] }),
      })
      if (res.ok) {
        const { items: expanded } = await res.json() as {
          items: Array<{ id: string; titulo_partida: string; descripcion_extendida: string }>
        }
        const exp = expanded[0]
        if (exp) {
          setExtendedEdit(prev => prev ? {
            ...prev,
            titulo: exp.titulo_partida ?? prev.titulo,
            descripcion: exp.descripcion_extendida ?? prev.descripcion,
          } : null)
        }
      }
    } catch {
      // Error silencioso en el modal
    } finally {
      setExtendedEdit(prev => prev ? { ...prev, regenerating: false } : null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] flex items-center justify-center">
        <p className="text-sm text-[#A9B5C2] italic">Cargando presupuesto...</p>
      </main>
    )
  }

  const lbl = 'block text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2]'
  const sec = 'bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm p-4 sm:p-6 space-y-4'
  const secTitle = 'text-xs font-bold text-[#6B7B8C] dark:text-[#A9B5C2] uppercase tracking-wider'

  const visibleChapters = chapters.filter(c => !c._deleted).sort((a, b) => a.position - b.position)
  const activeItem = activeId ? lineItems.find(i => i.id === activeId) : null
  const allChaptersCollapsed = visibleChapters.length > 0 && visibleChapters.every(ch => collapsedChapterIds.has(ch.id))
  const hasExtendedDescriptions = visibleItems.some(i => i.descripcion_extendida)

  return (
    <main
      className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A]"
      onClick={() => setOpenMenuId(null)}
    >
      {/* Barra superior */}
      <div className="bg-white dark:bg-[#1B2A3A] border-b border-[#D5DCE4] dark:border-[#3A4A5C] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/dashboard" className="text-[#6B7B8C] hover:text-[#FF6A00] text-sm transition-colors shrink-0">
            ← Volver
          </a>
          <span className="text-base font-bold text-[#0D1B2A] dark:text-[#F4F6F9] truncate">
            Presupuesto #{budget.budget_number}
          </span>
          {dirty && <span className="text-xs text-[#A9B5C2] shrink-0">Sin guardar</span>}
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="relative">
            <LoadingButton
              loading={saving}
              onClick={handleSave}
              variant="secondary"
              messages={["Guardando...", "Sincronizando datos...", "Casi listo..."]}
              duration={2000}
              className="border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-3 py-2 text-sm font-medium disabled:opacity-40 transition-colors"
            >
              Guardar borrador
            </LoadingButton>
            <Tooltip
              content="Tus cambios se guardan solos cada 30 segundos"
              placement="bottom-right"
              isActive={tooltipId === 'edit_autosave'}
              onDismiss={() => markSeen('edit_autosave')}
              onSkipAll={skipTour}
            />
          </div>
          <LoadingButton
            loading={generatingBudget}
            onClick={handleGenerateBudget}
            variant="secondary"
            messages={["Analizando partidas...", "Generando descripciones técnicas...", "Revisando terminología...", "Aplicando estilo profesional...", "Casi listo..."]}
            duration={20000}
            className="border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-3 py-2 text-sm font-medium disabled:opacity-40 transition-colors"
          >
            ✨ Generar presupuesto
          </LoadingButton>
          <LoadingButton
            loading={generatingPdf}
            onClick={pdfUrl ? handleDownloadPDF : handleGeneratePDF}
            variant="primary"
            messages={["Preparando el documento...", "Componiendo páginas...", "Aplicando formato profesional...", "Generando PDF..."]}
            duration={80000}
            messageInterval={15000}
            className="bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2.5 text-sm disabled:opacity-40 transition-colors"
          >
            {pdfUrl ? 'Descargar PDF' : 'Generar PDF'}
          </LoadingButton>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">

        {/* Datos del presupuesto */}
        <section className={sec}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={secTitle}>Datos del presupuesto</h2>
            <button
              type="button"
              aria-expanded={budgetSectionOpen}
              aria-controls="budget-details"
              onClick={() => setBudgetSectionOpen(v => !v)}
              className="text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors"
            >
              {budgetSectionOpen ? '↰ Contraer' : '↴ Expandir'}
            </button>
          </div>
          {budgetSectionOpen && (
            <div id="budget-details" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={lbl}>Fecha</label>
                  <input type="date" value={budget.issued_date}
                    onChange={e => updateBudgetField('issued_date', e.target.value)} className={`${inputClass} min-w-0`} />
                </div>
                <div className="space-y-1">
                  <label className={lbl}>Validez (días)</label>
                  <input type="number" value={budget.valid_days} min={1}
                    onChange={e => updateBudgetField('valid_days', Number(e.target.value))} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={lbl}>Nº presupuesto (auto)</label>
                  <input type="text" value={budget.budget_number} disabled
                    className="w-full bg-[#EDF0F4] dark:bg-[#3A4A5C] border border-[#D5DCE4] dark:border-[#3A4A5C] rounded-[8px] px-3 py-2 text-sm text-[#A9B5C2]" />
                </div>
                <div className="space-y-1">
                  <label className={lbl}>Nº factura / referencia</label>
                  <input type="text" value={budget.invoice_number}
                    onChange={e => updateBudgetField('invoice_number', e.target.value)}
                    placeholder="Ej. 26/001" className={inputClass} />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                {profileIban && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={budget.show_iban}
                      onChange={e => updateBudgetField('show_iban', e.target.checked)}
                      className="accent-[#FF6A00] w-4 h-4" />
                    <span className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9]">Mostrar IBAN en el PDF</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={budget.show_signature}
                    onChange={e => updateBudgetField('show_signature', e.target.checked)}
                    className="accent-[#FF6A00] w-4 h-4" />
                  <span className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9]">Incluir sección de firma</span>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Datos del cliente */}
        <section className={sec}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={secTitle}>Datos del cliente</h2>
            <button
              type="button"
              aria-expanded={clientSectionOpen}
              aria-controls="client-details"
              onClick={() => setClientSectionOpen(v => !v)}
              className="text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors"
            >
              {clientSectionOpen ? '↰ Contraer' : '↴ Expandir'}
            </button>
          </div>
          {clientSectionOpen && (
            <div id="client-details" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={lbl}>Nombre / empresa</label>
                  <input type="text" value={budget.client_name}
                    onChange={e => updateBudgetField('client_name', e.target.value)}
                    placeholder="Nombre del cliente" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={lbl}>NIF / CIF</label>
                  <input type="text" value={budget.client_nif}
                    onChange={e => updateBudgetField('client_nif', e.target.value)}
                    placeholder="12345678A" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={lbl}>Email</label>
                  <input type="email" value={budget.client_email}
                    onChange={e => updateBudgetField('client_email', e.target.value)}
                    placeholder="cliente@email.com" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={lbl}>Teléfono</label>
                  <input type="tel" value={budget.client_phone}
                    onChange={e => updateBudgetField('client_phone', e.target.value)}
                    placeholder="600 000 000" className={inputClass} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className={lbl}>Dirección</label>
                  <input type="text" value={budget.client_address}
                    onChange={e => updateBudgetField('client_address', e.target.value)}
                    placeholder="Calle, número, localidad" className={inputClass} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Capítulos y partidas */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsedChapterIds(new Set())}
            className="border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-3 py-2 text-sm font-medium transition-colors"
          >
            Expandir todos
          </button>
          <button
            type="button"
            onClick={() => setCollapsedChapterIds(new Set(chapters.filter(c => !c._deleted).map(c => c.id)))}
            disabled={allChaptersCollapsed}
            className="border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          >
            Contraer todos
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            <SortableContext
              items={visibleChapters.map(ch => `chapter:${ch.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {visibleChapters.map((chapter, chIdx) => {
                const chItems = visibleItems
                  .filter(i => i.chapter_id === chapter.id)
                  .sort((a, b) => a.position - b.position)
                const chSubtotal = chItems.reduce((s, i) => s + i.total, 0)
                const isOpen = !collapsedChapterIds.has(chapter.id)
                return (
                  <SortableChapterSection
                    key={chapter.id}
                    chapter={chapter}
                    chIdx={chIdx}
                    items={chItems}
                    chSubtotal={chSubtotal}
                    isOnlyChapter={visibleChapters.length === 1}
                    isOpen={isOpen}
                    onToggleOpen={() => setCollapsedChapterIds(prev => {
                      const next = new Set(prev)
                      if (next.has(chapter.id)) next.delete(chapter.id)
                      else next.add(chapter.id)
                      return next
                    })}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    onRename={renameChapter}
                    onDelete={requestDeleteChapter}
                    onAddItem={addItem}
                    onUpdateItem={updateItem}
                    onDeleteItem={deleteItem}
                    onEditExtended={openExtendedEdit}
                  />
                )
              })}
            </SortableContext>
          </div>

          <DragOverlay>
            {activeItem && (
              <div className="bg-white dark:bg-[#1B2A3A] shadow-lg rounded-[8px] border border-[#FF6A00]/40 px-3 py-2 text-sm text-[#0D1B2A] dark:text-[#F4F6F9] opacity-90 max-w-xs truncate">
                ⠿ {activeItem.description || 'Partida sin descripción'}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <div className="relative">
          <button
            type="button"
            onClick={addChapter}
            className="w-full py-3 border-2 border-dashed border-[#D5DCE4] dark:border-[#3A4A5C] rounded-[12px] text-sm font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] hover:border-[#FF6A00] hover:text-[#FF6A00] transition-colors"
          >
            + Añadir capítulo
          </button>
          <Tooltip
            content="Organiza las partidas por capítulos. Arrastra para reordenar"
            placement="top"
            isActive={tooltipId === 'edit_chapters'}
            onDismiss={() => markSeen('edit_chapters')}
            onSkipAll={skipTour}
          />
        </div>

        {/* Impuesto y costes adicionales */}
        <section className={sec}>
          <h2 className={secTitle}>Impuesto y costes adicionales</h2>
          <div className="space-y-1">
            <label className={lbl}>Tipo de impuesto</label>
            <div className="flex gap-4">
              {(['IGIC', 'IVA'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tax_type" value={t}
                    checked={budget.tax_type === t} onChange={() => handleTaxTypeChange(t)}
                    className="accent-[#FF6A00]" />
                  <span className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9]">
                    {t} ({t === 'IGIC' ? '7' : '21'}%)
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="overhead" checked={budget.overhead_enabled}
              onChange={e => updateBudgetField('overhead_enabled', e.target.checked)}
              className="accent-[#FF6A00] w-4 h-4" />
            <label htmlFor="overhead" className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9] flex-1 cursor-pointer">
              Gastos generales
            </label>
            <div className="flex items-center gap-1">
              <input type="number" value={budget.overhead_rate} min={0} max={100} step="0.01"
                disabled={!budget.overhead_enabled}
                onChange={e => updateBudgetField('overhead_rate', Number(e.target.value))}
                className="w-20 bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] rounded-[8px] px-2 py-1.5 text-sm text-right disabled:opacity-40 focus:outline-none focus:border-[#FF6A00] transition-colors" />
              <span className="text-sm text-[#6B7B8C]">%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="profit" checked={budget.profit_enabled}
              onChange={e => updateBudgetField('profit_enabled', e.target.checked)}
              className="accent-[#FF6A00] w-4 h-4" />
            <label htmlFor="profit" className="text-sm text-[#0D1B2A] dark:text-[#F4F6F9] flex-1 cursor-pointer">
              Beneficio industrial
            </label>
            <div className="flex items-center gap-1">
              <input type="number" value={budget.profit_rate} min={0} max={100} step="0.01"
                disabled={!budget.profit_enabled}
                onChange={e => updateBudgetField('profit_rate', Number(e.target.value))}
                className="w-20 bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] rounded-[8px] px-2 py-1.5 text-sm text-right disabled:opacity-40 focus:outline-none focus:border-[#FF6A00] transition-colors" />
              <span className="text-sm text-[#6B7B8C]">%</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className={lbl}>Extras fuera de presupuesto (descripción)</label>
              <input type="text" value={budget.extras_description}
                onChange={e => updateBudgetField('extras_description', e.target.value)}
                placeholder="Ej. Gestión de residuos" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Importe (€)</label>
              <input type="number" value={budget.extras_amount} min={0} step="0.01"
                onChange={e => updateBudgetField('extras_amount', Number(e.target.value))}
                className={inputClass} />
            </div>
          </div>
        </section>

        {/* Resumen de precios */}
        <section className={sec}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
              <span>Presupuesto de ejecución material</span><span>{fmt(subtotal)} €</span>
            </div>
            {budget.overhead_enabled && (
              <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
                <span>Gastos generales ({budget.overhead_rate}%)</span><span>{fmt(overhead)} €</span>
              </div>
            )}
            {budget.profit_enabled && (
              <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
                <span>Beneficio industrial ({budget.profit_rate}%)</span><span>{fmt(profit)} €</span>
              </div>
            )}
            {extras > 0 && (
              <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
                <span>{budget.extras_description || 'Extras'}</span><span>{fmt(extras)} €</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] pt-1 border-t border-[#D5DCE4] dark:border-[#3A4A5C]">
              <span>Base imponible</span><span>{fmt(baseImponible)} €</span>
            </div>
            <div className="flex justify-between text-[#6B7B8C] dark:text-[#A9B5C2]">
              <span>{budget.tax_type} ({budget.tax_rate}%)</span><span>{fmt(taxAmount)} €</span>
            </div>
            <div className="flex justify-between font-bold text-[#0D1B2A] dark:text-[#F4F6F9] text-base pt-2 border-t border-[#D5DCE4] dark:border-[#3A4A5C]">
              <span>Total</span><span>{fmt(totalAmount)} €</span>
            </div>
          </div>
        </section>

        {saveError && (
          <p role="alert" className="rounded-[8px] bg-red-50 dark:bg-red-900/20 border border-[#E5484D]/40 px-4 py-3 text-sm text-[#E5484D]">
            {saveError}
          </p>
        )}

        {/* Botones móvil */}
        <div className="flex flex-col gap-3 pb-4">
          <LoadingButton
            loading={saving}
            onClick={handleSave}
            variant="primary"
            messages={["Guardando...", "Sincronizando datos...", "Casi listo..."]}
            duration={2000}
            className="w-full bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 transition-colors"
          >
            Guardar borrador
          </LoadingButton>
          <LoadingButton
            loading={generatingBudget}
            onClick={handleGenerateBudget}
            variant="secondary"
            messages={["Analizando partidas...", "Generando descripciones técnicas...", "Revisando terminología...", "Aplicando estilo profesional...", "Casi listo..."]}
            duration={20000}
            className="w-full border-2 border-[#FF6A00] text-[#FF6A00] hover:bg-orange-50 dark:hover:bg-orange-900/10 font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 transition-colors"
          >
            ✨ Generar presupuesto
          </LoadingButton>
          <LoadingButton
            loading={generatingPdf}
            onClick={pdfUrl ? handleDownloadPDF : handleGeneratePDF}
            variant="secondary"
            messages={["Preparando el documento...", "Componiendo páginas...", "Aplicando formato profesional...", "Generando PDF..."]}
            duration={80000}
            messageInterval={15000}
            className="w-full bg-[#EDF0F4] dark:bg-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] hover:bg-[#D5DCE4] dark:hover:bg-[#4A5A6C] font-semibold rounded-[8px] px-4 py-4 text-base disabled:opacity-40 transition-colors"
          >
            {pdfUrl ? 'Descargar PDF' : 'Generar PDF'}
          </LoadingButton>
          {!hasExtendedDescriptions && (
            <p className="text-xs text-[#A9B5C2] text-center">
              Genera el presupuesto primero para obtener descripciones profesionales
            </p>
          )}
        </div>
        <div className="space-y-2 pb-8">
          <div className="relative flex flex-wrap gap-3">
            <LoadingButton
              loading={loadingCsv}
              onClick={handleExportCSV}
              variant="secondary"
              messages={["Preparando datos...", "Generando CSV..."]}
              duration={1000}
              className="flex-1 border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] font-medium rounded-[8px] px-4 py-3 text-sm disabled:opacity-40 transition-colors"
            >
              Exportar CSV
            </LoadingButton>
            <LoadingButton
              loading={loadingExcel}
              onClick={handleExportExcel}
              variant="secondary"
              messages={["Preparando datos...", "Aplicando formato Excel...", "Generando archivo..."]}
              duration={2000}
              className="flex-1 border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] font-medium rounded-[8px] px-4 py-3 text-sm disabled:opacity-40 transition-colors"
            >
              Exportar Excel
            </LoadingButton>
            <LoadingButton
              loading={generatingBC3}
              onClick={handleExportBC3}
              variant="secondary"
              messages={["Analizando partidas...", "Generando descomposición de precios...", "Calculando unidades básicas...", "Componiendo archivo BC3...", "Casi listo..."]}
              duration={40000}
              className="flex-1 border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] font-medium rounded-[8px] px-4 py-3 text-sm disabled:opacity-40 transition-colors"
            >
              Exportar BC3
            </LoadingButton>
            <Tooltip
              content="Genera tu PDF profesional, o exporta a Excel/CSV/BC3"
              placement="top-right"
              isActive={tooltipId === 'edit_export'}
              onDismiss={() => markSeen('edit_export')}
              onSkipAll={skipTour}
            />
          </div>
          <p className="text-xs text-[#A9B5C2]">
            BC3 incluye descomposición IA de precios — puede tardar 10-20 segundos
          </p>
        </div>

      </div>

      {/* Modal: confirmar eliminación de capítulo */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Eliminar capítulo</h3>
            {deleteConfirm.itemCount > 0 ? (
              <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
                &ldquo;{deleteConfirm.chapterName}&rdquo; tiene {deleteConfirm.itemCount}{' '}
                partida{deleteConfirm.itemCount !== 1 ? 's' : ''}. ¿Qué hacer con ellas?
              </p>
            ) : (
              <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
                ¿Eliminar el capítulo &ldquo;{deleteConfirm.chapterName}&rdquo;?
              </p>
            )}
            <div className="flex flex-col gap-2">
              {deleteConfirm.itemCount > 0 && (
                <button type="button" onClick={() => confirmDeleteChapter(true)}
                  className="w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] text-[#0D1B2A] dark:text-[#F4F6F9] rounded-[8px] px-4 py-3 text-sm font-medium hover:bg-[#D5DCE4] dark:hover:bg-[#3A4A5C] transition-colors">
                  Mover partidas al capítulo anterior
                </button>
              )}
              <button type="button" onClick={() => confirmDeleteChapter(false)}
                className="w-full bg-red-50 dark:bg-red-900/20 text-[#E5484D] rounded-[8px] px-4 py-3 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                {deleteConfirm.itemCount > 0 ? 'Eliminar también las partidas' : 'Eliminar'}
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)}
                className="w-full text-[#6B7B8C] text-sm py-2 hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9] transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: editar descripción extendida */}
      {extendedEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Editar descripción extendida</h3>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2]">
                  Título de la partida
                </label>
                <span className={`text-xs ${extendedEdit.titulo.length > 50 ? 'text-[#F5A623]' : 'text-[#A9B5C2]'}`}>
                  {extendedEdit.titulo.length}/60
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={60}
                value={extendedEdit.titulo}
                onChange={e => setExtendedEdit(prev => prev ? { ...prev, titulo: e.target.value } : null)}
                placeholder="Título corto de la partida"
                className={`${inputClass} resize-y min-w-0`}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2]">
                Descripción extendida
              </label>
              <textarea
                rows={5}
                value={extendedEdit.descripcion}
                onChange={e => setExtendedEdit(prev => prev ? { ...prev, descripcion: e.target.value } : null)}
                placeholder="Descripción técnica y profesional de la partida..."
                className={`${inputClass} resize-y`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRegenerateExtended}
                disabled={extendedEdit.regenerating}
                className="w-full border border-[#FF6A00] text-[#FF6A00] hover:bg-orange-50 dark:hover:bg-orange-900/20 font-semibold rounded-[8px] px-4 py-2.5 text-sm disabled:opacity-40 transition-colors"
              >
                {extendedEdit.regenerating ? 'Regenerando...' : '✨ Regenerar con IA'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveExtended}
                  disabled={extendedEdit.saving}
                  className="flex-1 bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2.5 text-sm disabled:opacity-40 transition-colors"
                >
                  {extendedEdit.saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setExtendedEdit(null)}
                  className="flex-1 bg-[#F4F6F9] dark:bg-[#0D1B2A] text-[#6B7B8C] dark:text-[#A9B5C2] hover:bg-[#D5DCE4] dark:hover:bg-[#3A4A5C] font-semibold rounded-[8px] px-4 py-2.5 text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
