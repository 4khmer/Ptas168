export default function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="text-center py-10 px-4">
      {icon && (
        <div className="flex justify-center mb-3 text-[#d1d3cf]">
          {icon}
        </div>
      )}
      {title && (
        <div className="text-[16px] font-semibold text-[#0e0f0c] mb-1">{title}</div>
      )}
      {subtitle && (
        <div className="text-[14px] text-[#454745] leading-relaxed">{subtitle}</div>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  )
}
