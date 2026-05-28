import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

interface SearchBarProps {
  placeholder?: string
  value: string
  onChange: (v: string) => void
  className?: string
  onSubmit?: () => void
  rightSlot?: ReactNode
}

/**
 * Search bar — Airbnb-style pill: 1px Hairline Gray border, full pill (32px),
 * subtle floating shadow, Rausch circular submit when onSubmit is provided.
 */
export default function SearchBar({ placeholder = 'Search…', value, onChange, className = '', onSubmit, rightSlot }: SearchBarProps) {
  return (
    <div
      className={`flex items-center gap-2 bg-white rounded-full border border-[#d1d3cf] shadow-search ${(rightSlot || onSubmit) ? 'pl-4 pr-1.5' : 'px-4'} py-2 ${className}`}
    >
      <Search size={16} className="text-[#454745] flex-shrink-0" />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onSubmit) onSubmit() }}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-[14px] font-medium text-[#0e0f0c] placeholder:text-[#454745] placeholder:font-medium"
      />
      {rightSlot ?? (onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          aria-label="Search"
          className="w-8 h-8 rounded-full bg-[#9fe870] hover:bg-[#cdffad] active:scale-[0.92] flex items-center justify-center text-[#0e0f0c] transition-transform flex-shrink-0"
        >
          <Search size={14} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  )
}
