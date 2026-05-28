interface ToggleProps {
  on: boolean
  onToggle?: () => void
  disabled?: boolean
}

export default function Toggle({ on, onToggle, disabled = false }: ToggleProps) {
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      className={`w-[38px] h-[22px] rounded-full relative flex-shrink-0 transition-colors duration-200 ${on ? 'bg-[#0e0f0c]' : 'bg-[#d1d3cf]'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div
        className={`absolute w-4 h-4 bg-white rounded-full top-[3px] shadow-sm transition-all duration-200 ${on ? 'left-[19px]' : 'left-[3px]'}`}
      />
    </div>
  )
}
