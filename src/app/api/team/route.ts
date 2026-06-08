export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanLimits, type PlanKey } from '@/lib/plans'

// ── GET: listar miembros ───────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: rows } = await supabase
      .from('teams')
      .select('member_id, created_at')
      .eq('owner_id', user.id)

    if (!rows || rows.length === 0) return NextResponse.json({ members: [] })

    const admin = createAdminClient()
    const members = await Promise.all(
      rows.map(async row => {
        const { data: { user: member } } = await admin.auth.admin.getUserById(row.member_id)
        return {
          id: row.member_id,
          email: member?.email ?? '',
          created_at: row.created_at,
        }
      })
    )

    return NextResponse.json({ members })
  } catch (err) {
    console.error('GET /api/team:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST: crear miembro ────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Verificar que el owner tiene plan que permite equipos
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('plan_key, is_team')
      .eq('id', user.id)
      .single()

    const planKey = (ownerProfile?.plan_key ?? 'trial') as PlanKey
    const limits = getPlanLimits(planKey, ownerProfile?.is_team ?? false)

    if (limits.maxUsers === 1 || (planKey !== 'profesional' && planKey !== 'empresa' && !ownerProfile?.is_team)) {
      return NextResponse.json({ error: 'plan_no_teams' }, { status: 403 })
    }

    // Contar miembros actuales
    const { count } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    const currentCount = count ?? 0
    const maxMembers = limits.maxUsers !== null ? limits.maxUsers - 1 : null // -1 porque el owner cuenta

    if (maxMembers !== null && currentCount >= maxMembers) {
      return NextResponse.json({ error: 'member_limit_reached' }, { status: 403 })
    }

    const { email, password } = await request.json()
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Crear usuario en auth
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return NextResponse.json({ error: createError?.message ?? 'Error al crear usuario' }, { status: 422 })
    }

    const newUserId = newUser.user.id

    // Insertar profile del miembro heredando el plan del owner
    await admin.from('profiles').insert({
      id: newUserId,
      plan_key: planKey,
      subscription_status: 'active',
    })

    // Insertar en teams
    const { error: teamError } = await admin.from('teams').insert({
      owner_id: user.id,
      member_id: newUserId,
    })

    if (teamError) {
      // Rollback: eliminar el usuario creado
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: 'Error al añadir al equipo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, email })
  } catch (err) {
    console.error('POST /api/team:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── DELETE: eliminar miembro ───────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { memberId } = await request.json()
    if (!memberId) return NextResponse.json({ error: 'memberId requerido' }, { status: 400 })

    // Verificar que el autenticado es el owner de este miembro
    const { data: teamRow } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .eq('member_id', memberId)
      .single()

    if (!teamRow) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const admin = createAdminClient()

    // Migrar presupuestos del miembro al owner
    await admin.from('budgets').update({ user_id: user.id }).eq('user_id', memberId)

    // Eliminar fila del equipo
    await admin.from('teams').delete().eq('owner_id', user.id).eq('member_id', memberId)

    // Resetear plan del miembro a trial
    await admin.from('profiles').update({
      plan_key: 'trial',
      subscription_status: 'trial',
    }).eq('id', memberId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/team:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
