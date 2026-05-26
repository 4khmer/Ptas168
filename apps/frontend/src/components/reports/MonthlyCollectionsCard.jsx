import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useReportSeries, fmtAxisMoney } from './MonthlyChartData'

const COLLECTED_COLOR = '#3B82F6'   // blue-500
const EXPECTED_COLOR  = '#E5E7EB'   // grey-200

export default function MonthlyCollectionsCard({ title = 'Monthly Collections' }) {
  const { year, months } = useReportSeries()

  return (
    <div className="bg-white rounded-2xl border border-[#d1d3cf] p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[18px] font-bold text-[#0e0f0c]">{title}</h3>
        <span className="text-[13px] text-[#454745]">{year}</span>
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
              tickFormatter={fmtAxisMoney}
              width={40}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #d1d3cf', fontSize: 12 }}
              formatter={v => `$${Number(v).toLocaleString()}`}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            />
            {/* Expected first → grey bars sit behind the blue ones in the */}
            {/* legend ordering ("Collected" appears first, matching screenshot). */}
            <Bar dataKey="expected"  name="Expected"  fill={EXPECTED_COLOR}  radius={[6, 6, 0, 0]} />
            <Bar dataKey="collected" name="Collected" fill={COLLECTED_COLOR} radius={[6, 6, 0, 0]} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 13, paddingTop: 6 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
