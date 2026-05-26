/**
 * Button — Wise-style chrome.
 *
 * Primary: lime-green pill with ink label. The signature brand CTA.
 * Outline (secondary): sage-tinted fill.
 * Tertiary outline: white with an ink hairline.
 * Dark: ink polarity-flip.
 * Danger: negative-tinted background.
 * Ghost: text-only.
 *
 * All variants share Wise's 24px pill geometry and Inter weight 600.
 *
 * variant: 'primary' | 'outline' | 'tertiary' | 'danger' | 'ghost' | 'dark'
 * size:    'md' | 'sm'
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  fullWidth = true,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-[24px] cursor-pointer select-none border-0 transition-transform active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0e0f0c] focus-visible:ring-offset-0'

  const sizes = {
    md: 'px-6 py-3 text-[16px]',
    sm: 'px-4 py-2 text-[14px]',
  }

  const variants = {
    // Wise primary — lime pill, ink label. Hover lifts to the lighter
    // primary-active tint; disabled drops to a muted sage so it still
    // feels at-home on the canvas.
    primary:  'bg-[#9fe870] text-[#0e0f0c] hover:bg-[#cdffad] disabled:bg-[#d1d3cf] disabled:text-[#868685]',
    // Sage-tinted secondary — Wise calls this the "secondary".
    outline:  'bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#d8ddd6]',
    // Tertiary outline — white pill with an ink hairline border.
    tertiary: 'bg-white text-[#0e0f0c] border border-[#0e0f0c] hover:bg-[#f3f5f1]',
    // Ink polarity-flip — used for "Search"/dark emphasis moments.
    dark:     'bg-[#0e0f0c] text-white hover:bg-[#1a1c18]',
    // Destructive — Wise negative red, soft fill.
    danger:   'bg-[#fdecea] text-[#d03238] hover:bg-[#f9d6d2]',
    // Ghost — text-only, sage hover.
    ghost:    'bg-transparent text-[#454745] hover:bg-[#e8ebe6]',
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
