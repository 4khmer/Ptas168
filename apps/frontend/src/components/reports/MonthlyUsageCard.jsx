import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { useUsageSeries, fmtAxisCount } from './MonthlyChartData'

// Whole-year monthly usage for either water (m³) or electricity (kWh).
// `dataKey` selects which bucket to plot; `color`, `unit`, and `title`
// are theming props so the same card serves both meters.
export default function MonthlyUsageCard({ title, dataKey, unit, color }) {
  const { year, months } = useUsageSeries()

  const total = months.reduce((sum, m) => sum + (m[dataKey] || 0), 0)

  return (
    <div className="bg-white rounded-2xl border border-[#d1d3cf] p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[18px] font-bold text-[#0e0f0c]">{title}</h3>
        <span className="text-[13px] text-[#454745]">{year}</span>
      </div>
      <div className="text-[13px] text-[#454745] mt-0.5">
        {Math.round(total).toLocaleString()} {unit}
      </div>

      <div className="h-56 mt-2 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 4" stroke="#dde0db" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#454745', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#454745', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtAxisCount}
              width={40}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #d1d3cf', fontSize: 12 }}
              formatter={v => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
