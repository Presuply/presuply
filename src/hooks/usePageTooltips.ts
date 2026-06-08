'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePageTooltips(tooltipIds: string[]) {
  const [seenMap, setSeenMap] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)
  const idsRef = useRef(tooltipIds)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) { setLoaded(true); return }
        const { data } = await supabase
          .from('profiles')
          .select('tooltips_seen')
          .eq('id', user.id)
          .single()
        if (!cancelled) {
          setSeenMap((data?.tooltips_seen as Record<string, boolean>) ?? {})
          setLoaded(true)
        }
      } catch {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeId = loaded ? (idsRef.current.find(id => !seenMap[id]) ?? null) : null

  async function markSeen(id: string) {
    const updated = { ...seenMap, [id]: true }
    setSeenMap(updated)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ tooltips_seen: updated }).eq('id', user.id)
    } catch {}
  }

  async function skipAll() {
    const updated = { ...seenMap, ...Object.fromEntries(idsRef.current.map(id => [id, true])) }
    setSeenMap(updated)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ tooltips_seen: updated }).eq('id', user.id)
    } catch {}
  }

  return { activeId, markSeen, skipAll }
}
