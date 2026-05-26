import { getDayRingHex, getMonthFraction } from '../../lib/dayCounter'

/**
 * SVG circular progress ring showing billing cycle day position
 */
export default function DayRing({ day, daysInMonth, size = 50 }) {
  const radius = (size - 10) / 2  // 20 for size=50
  const circumference = 2 * Math.PI * radius
  const fraction = getMonthFraction(day, daysInMonth)
  const strokeColor = getDayRingHex(day)
  const dashOffset = circumference * (1 - fraction)

  return (
    <div style={{ width: size, height: size }} className="relative flex-shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#d1d3cf"
          strokeWidth={4}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      {/* Day label in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-[#0e0f0c] leading-none">{day}</span>
        <span className="text-[8px] text-[#454745] leading-none">/{daysInMonth}</span>
      </div>
    </div>
  )
}
