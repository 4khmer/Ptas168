import type { MouseEventHandler, ReactNode } from 'react'

interface CardProps {
  children?: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLDivElement>
  padding?: boolean
  elevated?: boolean
}

/**
 * Card — Wise chrome: pill-rounded 24px, borderless white surface that
 * relies on the sage canvas behind it to carry the visual elevation.
 * `elevated={true}` still adds a soft float shadow for modals / drawers.
 */
export default function Card({ children, className = '', onClick, padding = true, elevated = false }: CardProps) {
  const surface = elevated
    ? 'bg-white rounded-[24px] shadow-elev'
    : 'bg-white rounded-[24px]'
  return (
    <div
      className={`${surface} ${padding ? 'p-4' : ''} ${onClick ? 'cursor-pointer transition-transform active:scale-[0.99]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/** Horizontal divider — hairline on Wise canvas. */
export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-[#d1d3cf] ${className}`} />
}

/** Section label (small caps) — ink-grey eyebrow over a content section. */
export function SectionLabel({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] font-semibold text-[#454745] uppercase tracking-[0.5px] my-3 first:mt-0 ${className}`}>
      {children}
    </div>
  )
}
