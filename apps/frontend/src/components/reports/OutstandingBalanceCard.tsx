import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useReportSeries, fmtAxisMoney } from './MonthlyChartData'

const OUTSTANDING_COLOR = '#3B82F6'  // blue-500
const OVERDUE_COLOR     = '#DC2626'  // red-600

export default function OutstandingBalanceCard({ title = 'Outstanding Balance' }) {
  const { year, months } = useReportSeries()

  return (
    <div className="bg-white rounded-2xl border border-[#d1d3cf] p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[18px] font-bold text-[#0e0f0c]">{title}</h3>
        <span className="text-[13px] text-[#454745]">{year}</span>
      </div>

      <div className="h-56 mt-2 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ostFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={OUTSTANDING_COLOR} stopOpacity={0.18} />
                <stop offset="100%" stopColor={OUTSTANDING_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={fmtAxisMoney}
              width={40}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #d1d3cf', fontSize: 12 }}
              formatter={v => `$${Number(v).toLocaleString()}`}
            />
            <Area
              type="monotone"
              dataKey="outstanding"
              name="Outstanding"
              stroke={OUTSTANDING_COLOR}
              strokeWidth={3}
              fill="url(#ostFill)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="overdue"
              name="Overdue"
              stroke={OVERDUE_COLOR}
              strokeWidth={2.5}
              fill="transparent"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 13, paddingTop: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
