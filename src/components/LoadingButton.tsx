'use client'

import { useEffect, useRef, useState } from 'react'

interface LoadingButtonProps {
  loading: boolean
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  messages: string[]
  className?: string
  children: React.ReactNode
  duration?: number
  messageInterval?: number
}

export default function LoadingButton({
  loading,
  onClick,
  disabled,
  variant = 'secondary',
  messages,
  className = '',
  children,
  duration = 3000,
  messageInterval = 3000,
}: LoadingButtonProps) {
  const [progress, setProgress] = useState(0)
  const [transitionMs, setTransitionMs] = useState(300)
  const [msgIdx, setMsgIdx] = useState(0)
  const [msgVisible, setMsgVisible] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Barra de progreso ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      setTransitionMs(300)
      setProgress(100)
      const t = setTimeout(() => setProgress(0), 600)
      return () => clearTimeout(t)
    }

    const phase1Ms = Math.round(duration * 0.3)
    setTransitionMs(phase1Ms)
    setProgress(70)

    const t = setTimeout(() => {
      setTransitionMs(Math.round(duration * 0.7))
      setProgress(90)
    }, phase1Ms)

    return () => clearTimeout(t)
  }, [loading, duration])

  // ── Rotación de frases ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      setMsgIdx(0)
      setMsgVisible(true)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      return
    }
    if (messages.length <= 1) return

    intervalRef.current = setInterval(() => {
      setMsgVisible(false)
      fadeTimerRef.current = setTimeout(() => {
        setMsgIdx(prev => (prev + 1) % messages.length)
        setMsgVisible(true)
      }, 300)
    }, messageInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [loading, messages.length, messageInterval])

  const overlayClass =
    variant === 'primary' ? 'bg-[#CC5200]' : 'bg-[#D5DCE4] dark:bg-[#3A4A5C]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || !!disabled}
      className={`relative overflow-hidden ${loading ? '!opacity-100' : ''} ${className}`}
    >
      {loading && (
        <div
          className={`absolute inset-y-0 left-0 rounded-[8px] ${overlayClass}`}
          style={{ width: `${progress}%`, transition: `width ${transitionMs}ms linear` }}
        />
      )}
      <span
        className="relative z-10 transition-opacity duration-300"
        style={{ opacity: loading ? (msgVisible ? 1 : 0) : 1 }}
      >
        {loading ? messages[msgIdx] : children}
      </span>
    </button>
  )
}
