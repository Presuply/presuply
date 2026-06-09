'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Budget, Folder } from '@/types/database'
import { getPlanLimits, type PlanKey } from '@/lib/plans'
import OnboardingModal from '@/components/OnboardingModal'
import Tooltip from '@/components/Tooltip'
import { usePageTooltips } from '@/hooks/usePageTooltips'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'

// ── Constantes ─────────────────────────────────────────────────────────────

const FOLDER_COLORS = ['#FF6A00', '#1FB57A', '#3E7BFA', '#F5A623', '#E5484D', '#6B7B8C', '#0D1B2A', '#9B59B6']
const TRIAL_LIMIT = 3

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

// ── Icono carpeta ──────────────────────────────────────────────────────────

function FolderIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ── Selector de color ──────────────────────────────────────────────────────

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
      {FOLDER_COLORS.map(c => (
        <button key={c} type="button" onClick={() => onSelect(c)}
          className={`w-6 h-6 rounded-full border-2 transition-all ${selected === c ? 'border-[#0D1B2A] dark:border-[#F4F6F9] scale-110' : 'border-transparent hover:scale-105'}`}
          style={{ backgroundColor: c }} aria-label={`Color ${c}`} />
      ))}
    </div>
  )
}

// ── Fila de presupuesto arrastrable ────────────────────────────────────────

function DraggableBudgetRow({ budget, onDelete, deletingId }: {
  budget: Budget
  onDelete: (id: string) => void
  deletingId: string | null
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: budget.id })

  return (
    <li ref={setNodeRef} style={{ opacity: isDragging ? 0.35 : 1 }} className="flex items-stretch gap-2">
      <div className="flex flex-1 items-stretch bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] hover:border-[#FF6A00]/50 shadow-sm transition-colors overflow-hidden">
        <button type="button" {...listeners} {...attributes}
          aria-label="Arrastrar presupuesto"
          className="flex items-center justify-center w-8 shrink-0 text-[#C8D0D8] hover:text-[#6B7B8C] touch-none cursor-grab active:cursor-grabbing border-r border-[#D5DCE4] dark:border-[#3A4A5C] transition-colors">
          ⠿
        </button>
        <Link href={`/dashboard/presupuesto/${budget.id}`}
          className="flex flex-1 items-center justify-between gap-4 px-4 py-4 min-w-0">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#A9B5C2]">#{budget.budget_number}</span>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                budget.status === 'sent'
                  ? 'bg-[#1FB57A]/15 text-[#1FB57A]'
                  : 'bg-[#EDF0F4] dark:bg-[#3A4A5C] text-[#6B7B8C] dark:text-[#A9B5C2]'
              }`}>
                {budget.status === 'sent' ? 'Enviado' : 'Borrador'}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] truncate">
              {budget.client_name ?? 'Sin cliente'}
            </p>
            <p className="text-xs text-[#A9B5C2]">
              {budget.issued_date ? fmtDate(budget.issued_date) : '—'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">{fmt(budget.total)} €</p>
          </div>
        </Link>
      </div>
      <button type="button" onClick={() => onDelete(budget.id)} disabled={deletingId === budget.id}
        aria-label="Eliminar presupuesto"
        className="flex items-center justify-center w-12 shrink-0 bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#A9B5C2] hover:text-[#E5484D] hover:border-[#E5484D]/40 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors shadow-sm">
        {deletingId === budget.id ? (
          <span className="text-xs">...</span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        )}
      </button>
    </li>
  )
}

// ── Tarjeta de carpeta droppable ───────────────────────────────────────────

function DroppableFolderCard({
  folder, count, isExpanded, isRenaming, renameName, setRenameName,
  showColorPicker, openMenuId, setOpenMenuId, setColorPickerFolderId,
  onToggle, onRenameStart, onRenameConfirm, onColorChange, onDeleteRequest,
}: {
  folder: Folder; count: number; isExpanded: boolean
  isRenaming: boolean; renameName: string; setRenameName: (v: string) => void
  showColorPicker: boolean; openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  setColorPickerFolderId: (id: string | null) => void
  onToggle: () => void; onRenameStart: () => void; onRenameConfirm: () => void
  onColorChange: (color: string) => void; onDeleteRequest: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder_${folder.id}` })
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) { nameRef.current?.focus(); nameRef.current?.select() }
  }, [isRenaming])

  return (
    <div className="space-y-1">
      <div
        ref={setNodeRef}
        className={`relative bg-white dark:bg-[#1B2A3A] rounded-[12px] border shadow-sm transition-all ${
          isOver
            ? 'border-[#FF6A00] ring-2 ring-[#FF6A00]/30 scale-[1.02]'
            : isExpanded
            ? 'border-[#FF6A00]/40'
            : 'border-[#D5DCE4] dark:border-[#3A4A5C]'
        }`}
      >
        <div className="flex items-center">
          <button type="button" onClick={onToggle}
            className="flex flex-1 items-center gap-3 px-3 py-3 text-left min-w-0">
            <FolderIcon color={folder.color} size={22} />
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <input
                  ref={nameRef}
                  type="text"
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  onBlur={onRenameConfirm}
                  onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') { setRenameName(folder.name); onRenameConfirm() } }}
                  onClick={e => e.stopPropagation()}
                  className="w-full bg-transparent text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] focus:outline-none focus:ring-1 focus:ring-[#FF6A00] rounded px-1"
                />
              ) : (
                <p className="text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] truncate">{folder.name}</p>
              )}
              <p className="text-xs text-[#A9B5C2]">{count} presupuesto{count !== 1 ? 's' : ''}</p>
            </div>
            <span className="text-[#A9B5C2] text-xs shrink-0">{isExpanded ? '▲' : '▼'}</span>
          </button>

          {/* Menú ⋮ — hermano en flex, sin posicionamiento absoluto */}
          <div className="relative shrink-0 pr-1" onClick={e => e.stopPropagation()}>
            <button type="button"
              onClick={() => setOpenMenuId(openMenuId === folder.id ? null : folder.id)}
              className="w-7 h-7 flex items-center justify-center text-[#A9B5C2] hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9] hover:bg-[#F4F6F9] dark:hover:bg-[#0D1B2A] rounded transition-colors text-lg">
              ⋮
            </button>
            {openMenuId === folder.id && (
              <div className="absolute right-0 top-8 bg-white dark:bg-[#1B2A3A] border border-[#D5DCE4] dark:border-[#3A4A5C] rounded-[8px] shadow-lg z-20 min-w-[160px]">
                <button type="button" onClick={onRenameStart}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#0D1B2A] dark:text-[#F4F6F9] hover:bg-[#F4F6F9] dark:hover:bg-[#0D1B2A] transition-colors rounded-t-[8px]">
                  Renombrar
                </button>
                <button type="button" onClick={() => { setColorPickerFolderId(showColorPicker ? null : folder.id); setOpenMenuId(null) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#0D1B2A] dark:text-[#F4F6F9] hover:bg-[#F4F6F9] dark:hover:bg-[#0D1B2A] transition-colors">
                  Cambiar color
                </button>
                <button type="button" onClick={onDeleteRequest}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#E5484D] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-[8px]">
                  Eliminar carpeta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selector de color (debajo de la tarjeta) */}
      {showColorPicker && (
        <div className="bg-white dark:bg-[#1B2A3A] rounded-[8px] border border-[#D5DCE4] dark:border-[#3A4A5C] p-3 shadow-sm">
          <ColorPicker selected={folder.color} onSelect={color => { onColorChange(color); setColorPickerFolderId(null) }} />
        </div>
      )}
    </div>
  )
}

// ── Zona sin carpeta droppable ─────────────────────────────────────────────

function UnfolderedDropZone({ children, active }: { children: React.ReactNode; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'droppable_none' })
  return (
    <div ref={setNodeRef} className={`rounded-[12px] transition-all ${isOver && active ? 'ring-2 ring-[#FF6A00]/40 p-2' : ''}`}>
      {children}
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trial')
  const [budgetsUsed, setBudgetsUsed] = useState(0)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [planKey, setPlanKey] = useState<PlanKey>('trial')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isTeam, setIsTeam] = useState(false)
  const [showFolderUpgradeModal, setShowFolderUpgradeModal] = useState(false)
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null)

  // Búsqueda
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Carpetas UI
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [colorPickerFolderId, setColorPickerFolderId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0])
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<{
    folderId: string; folderName: string; budgetCount: number
  } | null>(null)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0)

  // DnD
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  // ── Carga inicial ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [foldersRes, budgetsRes, profileRes, teamMemberRes] = await Promise.all([
        supabase.from('folders').select('*').order('position'),
        supabase.from('budgets').select('*').order('updated_at', { ascending: false }),
        supabase.from('profiles').select('subscription_status, budgets_used, plan_key, is_team, onboarding_completed').eq('id', user.id).single(),
        supabase.from('teams').select('owner_id').eq('member_id', user.id).maybeSingle(),
      ])

      setFolders(foldersRes.data ?? [])
      setBudgets(budgetsRes.data ?? [])
      setUserEmail(user.email ?? '')
      if (profileRes.data) {
        setSubscriptionStatus(profileRes.data.subscription_status ?? 'trial')
        setBudgetsUsed(profileRes.data.budgets_used ?? 0)
        setPlanKey((profileRes.data.plan_key ?? 'trial') as PlanKey)
        setIsTeam(profileRes.data.is_team ?? false)
        setShowOnboarding(!profileRes.data.onboarding_completed)
      }

      if (teamMemberRes.data?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('id', teamMemberRes.data.owner_id)
          .single()
        setOwnerEmail(ownerProfile?.company_name || ownerProfile?.full_name || 'el propietario')
      }
      setLoading(false)
    }
    load()
  }, [router])

  // ── Búsqueda ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchActive) searchRef.current?.focus()
  }, [searchActive])

  const filteredBudgets = searchQuery.trim()
    ? budgets.filter(b => {
        const q = searchQuery.toLowerCase()
        const folder = folders.find(f => f.id === b.folder_id)
        return (
          (b.client_name ?? '').toLowerCase().includes(q) ||
          String(b.budget_number).includes(q) ||
          (folder?.name ?? '').toLowerCase().includes(q)
        )
      })
    : null

  // ── Presupuestos ───────────────────────────────────────────────────────
  async function handleDelete(budgetId: string) {
    if (!window.confirm('¿Seguro que quieres borrar este presupuesto? Esta acción no se puede deshacer.')) return
    setDeletingId(budgetId)
    const supabase = createClient()
    const { data: uploadRows } = await supabase.from('uploads').select('id, storage_path').eq('budget_id', budgetId)
    if (uploadRows && uploadRows.length > 0) {
      await supabase.storage.from('uploads').remove(uploadRows.map(u => u.storage_path))
      await supabase.from('uploads').delete().in('id', uploadRows.map(u => u.id))
    }
    await supabase.from('budgets').delete().eq('id', budgetId)
    setBudgets(prev => prev.filter(b => b.id !== budgetId))
    setDeletingId(null)
  }

  // ── Carpetas ───────────────────────────────────────────────────────────
  async function createFolder() {
    if (!newFolderName.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const maxPos = folders.length > 0 ? Math.max(...folders.map(f => f.position)) + 1 : 0
    const { data } = await supabase.from('folders')
      .insert({ user_id: user.id, name: newFolderName.trim(), color: newFolderColor, position: maxPos })
      .select().single()
    if (data) setFolders(prev => [...prev, data as Folder])
    setCreatingFolder(false)
    setNewFolderName('')
    setNewFolderColor(FOLDER_COLORS[0])
  }

  async function renameFolder(id: string, name: string) {
    if (!name.trim()) return
    const supabase = createClient()
    await supabase.from('folders').update({ name: name.trim() }).eq('id', id)
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: name.trim() } : f))
    setRenamingFolderId(null)
  }

  async function changeColor(id: string, color: string) {
    const supabase = createClient()
    await supabase.from('folders').update({ color }).eq('id', id)
    setFolders(prev => prev.map(f => f.id === id ? { ...f, color } : f))
  }

  async function deleteFolder(id: string, mode: 'move' | 'cascade') {
    const supabase = createClient()
    if (mode === 'cascade') {
      const toDelete = budgets.filter(b => b.folder_id === id)
      for (const b of toDelete) {
        await supabase.from('budgets').delete().eq('id', b.id)
      }
      setBudgets(prev => prev.filter(b => b.folder_id !== id))
    } else {
      await supabase.from('budgets').update({ folder_id: null }).eq('folder_id', id)
      setBudgets(prev => prev.map(b => b.folder_id === id ? { ...b, folder_id: null } : b))
    }
    await supabase.from('folders').delete().eq('id', id)
    setFolders(prev => prev.filter(f => f.id !== id))
    setExpandedFolderIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setDeleteFolderConfirm(null)
    setDeleteConfirmStep(0)
  }

  // ── Drag and drop ──────────────────────────────────────────────────────
  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over) return

    const budgetId = String(active.id)
    const overId = String(over.id)

    let newFolderId: string | null
    if (overId.startsWith('folder_')) {
      newFolderId = overId.replace('folder_', '')
    } else if (overId === 'droppable_none') {
      newFolderId = null
    } else {
      return
    }

    const budget = budgets.find(b => b.id === budgetId)
    if (!budget || budget.folder_id === newFolderId) return

    setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, folder_id: newFolderId } : b))
    const supabase = createClient()
    await supabase.from('budgets').update({ folder_id: newFolderId }).eq('id', budgetId)
  }

  // ── Tooltips ───────────────────────────────────────────────────────────
  const { activeId: tooltipId, markSeen, skipAll: skipTour } =
    usePageTooltips(['dash_new', 'dash_folder', 'dash_search'])

  // ── Onboarding ─────────────────────────────────────────────────────────
  async function completeOnboarding() {
    setShowOnboarding(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    }
  }

  // ── Portal Stripe ──────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────
  const remaining = Math.max(0, TRIAL_LIMIT - budgetsUsed)
  const isTrial = subscriptionStatus === 'trial'
  const hasSubscription = ['trialing', 'active', 'past_due'].includes(subscriptionStatus)
  const activeBudget = activeId ? budgets.find(b => b.id === activeId) : null
  const unfolderedBudgets = budgets.filter(b => !b.folder_id)

  return (
    <main
      className="min-h-screen bg-[#F4F6F9] dark:bg-[#0D1B2A] px-4 py-8"
      onClick={() => { setOpenMenuId(null); setColorPickerFolderId(null) }}
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Cabecera */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchActive ? (
            <div className="flex flex-1 items-center gap-2">
              <button type="button" onClick={() => { setSearchActive(false); setSearchQuery('') }}
                className="text-sm text-[#6B7B8C] hover:text-[#FF6A00] shrink-0 transition-colors">
                ← Volver
              </button>
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchActive(false); setSearchQuery('') } }}
                placeholder="Buscar por cliente, número o carpeta..."
                className="flex-1 bg-white dark:bg-[#1B2A3A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-[#FF6A00] transition-colors"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 shrink-0">
                <img src="/images/logo.svg" alt="Presuply" className="h-7 w-auto" />
                <h1 className="text-xl font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Presupuestos</h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="relative">
                  <button type="button" onClick={() => setSearchActive(true)}
                    aria-label="Buscar"
                    className="w-9 h-9 flex items-center justify-center text-[#6B7B8C] hover:text-[#FF6A00] hover:bg-white dark:hover:bg-[#1B2A3A] rounded-[8px] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </button>
                  <Tooltip
                    content="Busca cualquier presupuesto al instante"
                    placement="bottom-right"
                    isActive={!showOnboarding && tooltipId === 'dash_search'}
                    onDismiss={() => markSeen('dash_search')}
                    onSkipAll={skipTour}
                  />
                </div>
                {hasSubscription && (
                  <button type="button" onClick={handlePortal} disabled={openingPortal}
                    className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] disabled:opacity-40 transition-colors hidden sm:block">
                    {openingPortal ? 'Abriendo...' : 'Suscripción'}
                  </button>
                )}
                <Link href="/dashboard/perfil"
                  className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2] hover:text-[#FF6A00] transition-colors hidden sm:block">
                  Mi perfil
                </Link>
                {(() => {
                  const canUseFolders = getPlanLimits(planKey, isTeam).canUseFolders
                  return (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => canUseFolders ? (setCreatingFolder(true), setOpenMenuId(null)) : setShowFolderUpgradeModal(true)}
                        className="border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        {canUseFolders ? null : <span className="text-xs">🔒</span>}
                        + Carpeta
                      </button>
                      <Tooltip
                        content="Organiza tus presupuestos por zona o cliente"
                        placement="bottom-right"
                        isActive={!showOnboarding && tooltipId === 'dash_folder'}
                        onDismiss={() => markSeen('dash_folder')}
                        onSkipAll={skipTour}
                      />
                    </div>
                  )
                })()}
                <div className="relative">
                  <Link href="/dashboard/nuevo"
                    className="bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2.5 text-sm transition-colors inline-block">
                    + Nuevo
                  </Link>
                  <Tooltip
                    content="Crea un nuevo presupuesto subiendo fotos, PDFs o texto de WhatsApp"
                    placement="bottom-right"
                    isActive={!showOnboarding && tooltipId === 'dash_new'}
                    onDismiss={() => markSeen('dash_new')}
                    onSkipAll={skipTour}
                  />
                </div>
              </div>

              <div className="sm:hidden w-full flex items-center gap-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="flex-1 bg-white dark:bg-[#1B2A3A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-[#FF6A00] transition-colors min-w-0"
                />

                {(() => {
                  const canUseFolders = getPlanLimits(planKey, isTeam).canUseFolders
                  return (
                    <button
                      type="button"
                      onClick={() => canUseFolders ? (setCreatingFolder(true), setOpenMenuId(null)) : setShowFolderUpgradeModal(true)}
                      className="border border-[#D5DCE4] dark:border-[#3A4A5C] bg-white dark:bg-[#1B2A3A] text-[#0D1B2A] dark:text-[#F4F6F9] hover:border-[#FF6A00] hover:text-[#FF6A00] rounded-[8px] px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      {canUseFolders ? null : <span className="text-xs">🔒</span>}
                      Carpeta
                    </button>
                  )
                })()}

                <Link
                  href="/dashboard/nuevo"
                  className="bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-3 py-2 text-sm transition-colors inline-block shrink-0"
                >
                  Nuevo
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Banner miembro de equipo */}
        {ownerEmail && (
          <div className="rounded-[10px] bg-[#EDF0F4] dark:bg-[#1B2A3A] border border-[#D5DCE4] dark:border-[#3A4A5C] px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-[#6B7B8C] dark:text-[#A9B5C2]">
              Estás usando el plan de <strong className="text-[#0D1B2A] dark:text-[#F4F6F9]">{ownerEmail}</strong>
            </span>
          </div>
        )}

        {/* Banner trial */}
        {isTrial && !loading && (
          <div className={`rounded-[12px] border px-4 py-3 flex items-center justify-between gap-4 ${
            remaining === 0 ? 'bg-red-50 dark:bg-red-900/20 border-[#E5484D]/40'
              : remaining === 1 ? 'bg-orange-50 dark:bg-orange-900/20 border-[#FF6A00]/40'
              : 'bg-blue-50 dark:bg-blue-900/20 border-[#3E7BFA]/40'
          }`}>
            <p className={`text-sm font-medium ${
              remaining === 0 ? 'text-[#E5484D]' : remaining === 1 ? 'text-[#CC5500] dark:text-[#FF9248]' : 'text-[#3E7BFA]'
            }`}>
              {remaining === 0
                ? 'Has agotado los presupuestos gratuitos.'
                : `Te quedan ${remaining} de ${TRIAL_LIMIT} presupuesto${remaining === 1 ? '' : 's'} gratuito${remaining === 1 ? '' : 's'}.`}
            </p>
            <Link href="/pricing"
              className="shrink-0 bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-3 py-1.5 text-xs transition-colors">
              Activar plan
            </Link>
          </div>
        )}

        {/* Pago pendiente */}
        {subscriptionStatus === 'past_due' && !loading && (
          <div className="rounded-[12px] border border-[#E5484D]/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-[#E5484D]">
              Pago pendiente — actualiza tu método de pago para seguir usando Presuply.
            </p>
            <button type="button" onClick={handlePortal} disabled={openingPortal}
              className="shrink-0 bg-[#E5484D] hover:bg-red-700 text-white font-semibold rounded-[8px] px-3 py-1.5 text-xs disabled:opacity-40 transition-colors">
              Actualizar pago
            </button>
          </div>
        )}

        {/* Formulario nueva carpeta */}
        {creatingFolder && (
          <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm p-4 space-y-3"
            onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9]">Nueva carpeta</p>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') } }}
              placeholder="Nombre de la carpeta"
              autoFocus
              className="w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#0D1B2A] dark:text-[#F4F6F9] placeholder:text-[#A9B5C2] rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-[#FF6A00] transition-colors"
            />
            <ColorPicker selected={newFolderColor} onSelect={setNewFolderColor} />
            <div className="flex gap-2">
              <button type="button" onClick={createFolder}
                className="bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2 text-sm transition-colors">
                Crear
              </button>
              <button type="button" onClick={() => { setCreatingFolder(false); setNewFolderName('') }}
                className="border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#6B7B8C] hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9] rounded-[8px] px-4 py-2 text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        {loading ? (
          <p className="text-sm text-[#A9B5C2] italic">Cargando...</p>
        ) : filteredBudgets !== null ? (
          /* Resultados de búsqueda */
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] uppercase tracking-wider">
              {filteredBudgets.length} resultado{filteredBudgets.length !== 1 ? 's' : ''}
            </p>
            {filteredBudgets.length === 0 ? (
              <p className="text-sm text-[#A9B5C2] italic">No hay presupuestos que coincidan.</p>
            ) : (
              <ul className="space-y-2">
                {filteredBudgets.map(b => {
                  const folder = folders.find(f => f.id === b.folder_id)
                  return (
                    <li key={b.id} className="flex items-stretch gap-2">
                      <Link href={`/dashboard/presupuesto/${b.id}`}
                        className="flex flex-1 items-center justify-between gap-4 bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] hover:border-[#FF6A00]/50 px-4 py-4 transition-colors min-w-0 shadow-sm">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-[#A9B5C2]">#{b.budget_number}</span>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              b.status === 'sent' ? 'bg-[#1FB57A]/15 text-[#1FB57A]' : 'bg-[#EDF0F4] dark:bg-[#3A4A5C] text-[#6B7B8C] dark:text-[#A9B5C2]'
                            }`}>
                              {b.status === 'sent' ? 'Enviado' : 'Borrador'}
                            </span>
                            {folder && (
                              <span className="inline-flex items-center gap-1 text-xs text-[#6B7B8C] dark:text-[#A9B5C2]">
                                <FolderIcon color={folder.color} size={12} />
                                {folder.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] truncate">
                            {b.client_name ?? 'Sin cliente'}
                          </p>
                          <p className="text-xs text-[#A9B5C2]">{b.issued_date ? fmtDate(b.issued_date) : '—'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">{fmt(b.total)} €</p>
                        </div>
                      </Link>
                      <button type="button" onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}
                        aria-label="Eliminar presupuesto"
                        className="flex items-center justify-center w-12 shrink-0 bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#A9B5C2] hover:text-[#E5484D] hover:border-[#E5484D]/40 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors shadow-sm">
                        {deletingId === b.id ? <span className="text-xs">...</span> : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : budgets.length === 0 && folders.length === 0 ? (
          /* Estado vacío */
          <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] border border-[#D5DCE4] dark:border-[#3A4A5C] shadow-sm px-6 py-12 text-center space-y-4">
            <p className="text-[#6B7B8C] dark:text-[#A9B5C2]">Aún no tienes presupuestos.</p>
            <Link href="/dashboard/nuevo"
              className="inline-block bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-6 py-3 text-sm transition-colors">
              Crear el primero
            </Link>
          </div>
        ) : (
          /* Vista normal con carpetas y DnD */
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-6">

              {/* Grid de carpetas */}
              {folders.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {folders.map(folder => (
                    <DroppableFolderCard
                      key={folder.id}
                      folder={folder}
                      count={budgets.filter(b => b.folder_id === folder.id).length}
                      isExpanded={expandedFolderIds.has(folder.id)}
                      isRenaming={renamingFolderId === folder.id}
                      renameName={renameName}
                      setRenameName={setRenameName}
                      showColorPicker={colorPickerFolderId === folder.id}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      setColorPickerFolderId={setColorPickerFolderId}
                      onToggle={() => setExpandedFolderIds(prev => {
                        const n = new Set(prev)
                        n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id)
                        return n
                      })}
                      onRenameStart={() => { setRenamingFolderId(folder.id); setRenameName(folder.name); setOpenMenuId(null) }}
                      onRenameConfirm={() => renameFolder(folder.id, renameName || folder.name)}
                      onColorChange={color => changeColor(folder.id, color)}
                      onDeleteRequest={() => {
                        const count = budgets.filter(b => b.folder_id === folder.id).length
                        setDeleteFolderConfirm({ folderId: folder.id, folderName: folder.name, budgetCount: count })
                        setOpenMenuId(null)
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Presupuestos de carpetas expandidas */}
              {folders.filter(f => expandedFolderIds.has(f.id)).map(folder => {
                const fBudgets = budgets.filter(b => b.folder_id === folder.id)
                return (
                  <div key={folder.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FolderIcon color={folder.color} size={16} />
                      <span className="text-sm font-semibold" style={{ color: folder.color }}>{folder.name}</span>
                      <span className="text-xs text-[#A9B5C2]">({fBudgets.length})</span>
                    </div>
                    {fBudgets.length === 0 ? (
                      <p className="text-xs text-[#A9B5C2] italic pl-6">Carpeta vacía — arrastra presupuestos aquí.</p>
                    ) : (
                      <ul className="space-y-2">
                        {fBudgets.map(b => (
                          <DraggableBudgetRow key={b.id} budget={b} onDelete={handleDelete} deletingId={deletingId} />
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}

              {/* Presupuestos sin carpeta */}
              <UnfolderedDropZone active={!!activeId}>
                <div className="space-y-2">
                  {folders.length > 0 && unfolderedBudgets.length > 0 && (
                    <p className="text-xs font-semibold text-[#6B7B8C] dark:text-[#A9B5C2] uppercase tracking-wider">Sin carpeta</p>
                  )}
                  {unfolderedBudgets.length > 0 ? (
                    <ul className="space-y-2">
                      {unfolderedBudgets.map(b => (
                        <DraggableBudgetRow key={b.id} budget={b} onDelete={handleDelete} deletingId={deletingId} />
                      ))}
                    </ul>
                  ) : folders.length > 0 ? (
                    <div className="border-2 border-dashed border-[#D5DCE4] dark:border-[#3A4A5C] rounded-[12px] py-6 text-center">
                      <p className="text-xs text-[#A9B5C2]">Arrastra aquí para quitar de una carpeta</p>
                    </div>
                  ) : null}
                </div>
              </UnfolderedDropZone>

            </div>

            {/* Overlay del drag */}
            <DragOverlay>
              {activeBudget && (
                <div className="bg-white dark:bg-[#1B2A3A] shadow-xl rounded-[12px] border border-[#FF6A00]/40 px-4 py-3 text-sm font-semibold text-[#0D1B2A] dark:text-[#F4F6F9] opacity-95 max-w-xs">
                  ⠿ {activeBudget.client_name ?? `Presupuesto #${activeBudget.budget_number}`}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

      </div>

      {/* Modal: onboarding */}
      {showOnboarding && !loading && (
        <OnboardingModal userEmail={userEmail} onComplete={completeOnboarding} />
      )}

      {/* Modal: upgrade para carpetas */}
      {showFolderUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowFolderUpgradeModal(false)}>
          <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] p-6 max-w-sm w-full space-y-4 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <h3 className="font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Función bloqueada</h3>
            </div>
            <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
              Las carpetas están disponibles a partir del plan <strong className="text-[#0D1B2A] dark:text-[#F4F6F9]">Profesional</strong>.
            </p>
            <div className="flex gap-2">
              <Link href="/pricing"
                className="flex-1 bg-[#FF6A00] hover:bg-[#FF9248] text-white font-semibold rounded-[8px] px-4 py-2.5 text-sm text-center transition-colors">
                Ver planes →
              </Link>
              <button type="button" onClick={() => setShowFolderUpgradeModal(false)}
                className="flex-1 border border-[#D5DCE4] dark:border-[#3A4A5C] text-[#6B7B8C] hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9] rounded-[8px] px-4 py-2.5 text-sm transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar eliminación de carpeta */}
      {deleteFolderConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#1B2A3A] rounded-[12px] p-6 max-w-sm w-full space-y-4 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#0D1B2A] dark:text-[#F4F6F9]">Eliminar carpeta</h3>
            {deleteFolderConfirm.budgetCount > 0 ? (
              <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
                &ldquo;{deleteFolderConfirm.folderName}&rdquo; contiene {deleteFolderConfirm.budgetCount} presupuesto{deleteFolderConfirm.budgetCount !== 1 ? 's' : ''}. ¿Qué quieres hacer?
              </p>
            ) : (
              <p className="text-sm text-[#6B7B8C] dark:text-[#A9B5C2]">
                ¿Eliminar la carpeta &ldquo;{deleteFolderConfirm.folderName}&rdquo;?
              </p>
            )}
            <div className="flex flex-col gap-2">
              {deleteFolderConfirm.budgetCount > 0 && (
                <button type="button"
                  onClick={() => deleteFolder(deleteFolderConfirm.folderId, 'move')}
                  className="w-full bg-[#F4F6F9] dark:bg-[#0D1B2A] text-[#0D1B2A] dark:text-[#F4F6F9] rounded-[8px] px-4 py-3 text-sm font-medium hover:bg-[#D5DCE4] dark:hover:bg-[#3A4A5C] transition-colors">
                  Mover presupuestos a inicio
                </button>
              )}
              {deleteConfirmStep === 0 ? (
                <button type="button"
                  onClick={() => deleteFolderConfirm.budgetCount > 0 ? setDeleteConfirmStep(1) : deleteFolder(deleteFolderConfirm.folderId, 'cascade')}
                  className="w-full bg-red-50 dark:bg-red-900/20 text-[#E5484D] rounded-[8px] px-4 py-3 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  {deleteFolderConfirm.budgetCount > 0 ? 'Eliminar carpeta y presupuestos' : 'Eliminar'}
                </button>
              ) : (
                <button type="button"
                  onClick={() => deleteFolder(deleteFolderConfirm.folderId, 'cascade')}
                  className="w-full bg-[#E5484D] text-white rounded-[8px] px-4 py-3 text-sm font-bold hover:bg-red-700 transition-colors">
                  ¿Confirmar eliminación total?
                </button>
              )}
              <button type="button"
                onClick={() => { setDeleteFolderConfirm(null); setDeleteConfirmStep(0) }}
                className="w-full text-[#6B7B8C] text-sm py-2 hover:text-[#0D1B2A] dark:hover:text-[#F4F6F9] transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
