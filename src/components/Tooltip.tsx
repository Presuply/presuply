'use client'

type Placement = 'bottom' | 'bottom-right' | 'top' | 'top-right' | 'right' | 'left'

interface TooltipProps {
  content: string
  placement?: Placement
  isActive: boolean
  onDismiss: () => void
  onSkipAll: () => void
}

const WRAPPER: Record<Placement, string> = {
  'bottom':       'absolute top-full left-0 z-40 mt-2',
  'bottom-right': 'absolute top-full right-0 z-40 mt-2',
  'top':          'absolute bottom-full left-0 z-40 mb-2',
  'top-right':    'absolute bottom-full right-0 z-40 mb-2',
  'right':        'absolute left-full top-0 z-40 ml-2',
  'left':         'absolute right-full top-0 z-40 mr-2',
}

// Rotated-square arrow: bg-white + two borders matching the box border
const ARROW: Record<Placement, string> = {
  'bottom':       'absolute -top-[5px] left-4 w-[10px] h-[10px] rotate-45 bg-white border-l border-t border-[#FF6A00]/30',
  'bottom-right': 'absolute -top-[5px] right-4 w-[10px] h-[10px] rotate-45 bg-white border-l border-t border-[#FF6A00]/30',
  'top':          'absolute -bottom-[5px] left-4 w-[10px] h-[10px] rotate-45 bg-white border-r border-b border-[#FF6A00]/30',
  'top-right':    'absolute -bottom-[5px] right-4 w-[10px] h-[10px] rotate-45 bg-white border-r border-b border-[#FF6A00]/30',
  'right':        'absolute -left-[5px] top-3 w-[10px] h-[10px] rotate-45 bg-white border-l border-b border-[#FF6A00]/30',
  'left':         'absolute -right-[5px] top-3 w-[10px] h-[10px] rotate-45 bg-white border-r border-t border-[#FF6A00]/30',
}

export default function Tooltip({
  content,
  placement = 'bottom',
  isActive,
  onDismiss,
  onSkipAll,
}: TooltipProps) {
  if (!isActive) return null

  return (
    <div className={WRAPPER[placement]}>
      <div className="relative bg-white border border-[#FF6A00]/30 rounded-[10px] shadow-lg px-3 py-2.5 min-w-[170px] max-w-[220px]">
        <div className={ARROW[placement]} />
        <p className="text-xs text-[#0D1B2A] leading-relaxed mb-2.5">{content}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-semibold text-[#FF6A00] hover:text-[#FF9248] transition-colors"
          >
            Entendido
          </button>
          <button
            type="button"
            onClick={onSkipAll}
            className="text-xs text-[#A9B5C2] hover:text-[#6B7B8C] transition-colors"
          >
            Saltar tour
          </button>
        </div>
      </div>
    </div>
  )
}
