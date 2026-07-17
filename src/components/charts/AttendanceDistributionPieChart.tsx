import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'

export interface AttendanceDistributionSlice {
  name: string
  value: number
  color: string
}

interface AttendanceDistributionPieChartProps {
  data: AttendanceDistributionSlice[]
}

export function AttendanceDistributionPieChart({
  data,
}: AttendanceDistributionPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={32}
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.color}
              stroke="var(--card)"
              strokeWidth={2}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
